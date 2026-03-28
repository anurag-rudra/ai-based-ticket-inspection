"""
ticket_hygiene.py
=================
Scans incident_event_log.csv and returns a JSON payload for analysis.html.

Usage:
    python ticket_hygiene.py --csv incident_event_log.csv
    python ticket_hygiene.py --csv incident_event_log.csv --out analysis_output.json
"""

import argparse
import json
import pandas as pd

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _is_missing(v):
    if pd.isna(v):
        return True
    return str(v).strip() in ("", "?")


# ---------------------------------------------------------------------------
# Hygiene rules  (total weight = 10.0, so score is directly out of 10)
# ---------------------------------------------------------------------------

HYGIENE_RULES = [
    {
        "field": "assigned_to",
        "label": "Assigned To",
        "weight": 1.5,
        "check": lambda v: (
            (True,  "ASSIGNED", "No action required. Ticket is properly assigned.")
            if not _is_missing(v) else
            (False, "MISSING",  "Assign the ticket to a specific resolver. Unassigned tickets delay resolution and skew SLA metrics.")
        ),
    },
    {
        "field": "cmdb_ci",
        "label": "CMDB CI (Config Item)",
        "weight": 1.0,
        "check": lambda v: (
            (True,  "LINKED",  "Configuration item is properly linked.")
            if not _is_missing(v) else
            (False, "MISSING", "Link a Configuration Item from the CMDB. Critical for impact analysis and change tracking.")
        ),
    },
    {
        "field": "category",
        "label": "Category",
        "weight": 1.0,
        "check": lambda v: (
            (True,  "SPECIFIC",     "Category is populated and specific.")
            if not _is_missing(v) and str(v).lower() not in ("other", "miscellaneous", "general") else
            (False, "NON-SPECIFIC", "Replace generic category with a precise classification to enable trend analysis.")
        ),
    },
    {
        "field": "subcategory",
        "label": "Subcategory",
        "weight": 0.5,
        "check": lambda v: (
            (True,  "SPECIFIC", "Subcategory is populated.")
            if not _is_missing(v) else
            (False, "MISSING",  "Select a subcategory to improve reporting granularity and searchability.")
        ),
    },
    {
        "field": "u_symptom",
        "label": "Symptom",
        "weight": 0.5,
        "check": lambda v: (
            (True,  "RECORDED", "Symptom is recorded.")
            if not _is_missing(v) else
            (False, "MISSING",  "Document the observed symptom so future incidents can be correlated and auto-resolved.")
        ),
    },
    {
        "field": "impact",
        "label": "Impact",
        "weight": 1.0,
        "check": lambda v: (
            (True,  "SET",     "Impact level is defined.")
            if not _is_missing(v) else
            (False, "MISSING", "Set the impact level (e.g., 1 - High, 2 - Medium, 3 - Low) for correct prioritisation.")
        ),
    },
    {
        "field": "urgency",
        "label": "Urgency",
        "weight": 1.0,
        "check": lambda v: (
            (True,  "SET",     "Urgency level is defined.")
            if not _is_missing(v) else
            (False, "MISSING", "Set the urgency level to ensure the ticket is addressed within the correct SLA window.")
        ),
    },
    {
        "field": "u_priority_confirmation",
        "label": "Priority Confirmation",
        "weight": 0.5,
        "check": lambda v: (
            (True,  "CONFIRMED",   "Priority has been confirmed by a stakeholder.")
            if str(v).strip().lower() in ("true", "1", "yes") else
            (False, "UNCONFIRMED", "Have the priority confirmed by the requestor or supervisor to avoid SLA mis-classification.")
        ),
    },
    {
        "field": "closed_code",
        "label": "Closed Code",
        "weight": 1.0,
        "check": lambda v: (
            (True,  "SET",     "Closed code is recorded.")
            if not _is_missing(v) else
            (False, "MISSING", "Select the appropriate closure code before archiving the ticket.")
        ),
    },
    {
        "field": "resolved_by",
        "label": "Resolved By",
        "weight": 0.5,
        "check": lambda v: (
            (True,  "RECORDED", "Resolver is recorded.")
            if not _is_missing(v) else
            (False, "MISSING",  "Record who resolved the ticket to enable workload reporting and knowledge attribution.")
        ),
    },
    {
        "field": "resolved_at",
        "label": "Resolved At (Timestamp)",
        "weight": 0.5,
        "check": lambda v: (
            (True,  "RECORDED", "Resolution timestamp is present.")
            if not _is_missing(v) else
            (False, "MISSING",  "Log the resolution timestamp so MTTR can be calculated accurately.")
        ),
    },
    {
        "field": "problem_id",
        "label": "Problem ID",
        "weight": 0.5,
        "check": lambda v: (
            (True,  "LINKED",     "Linked to a Problem record.")
            if not _is_missing(v) else
            (False, "NOT LINKED", "Link to a Problem record if a root cause investigation is underway.")
        ),
    },
    {
        "field": "knowledge",
        "label": "Knowledge Article Created",
        "weight": 0.5,
        "check": lambda v: (
            (True,  "CREATED", "A knowledge article has been created from this incident.")
            if str(v).strip().lower() in ("true", "1", "yes") else
            (False, "MISSING",  "Create a Knowledge Base article from the resolution steps to reduce future resolution times.")
        ),
    },
]

MAX_SCORE = sum(r["weight"] for r in HYGIENE_RULES)  # 10.0


# ---------------------------------------------------------------------------
# Per-ticket analysis
# ---------------------------------------------------------------------------

def analyse_ticket(row: pd.Series) -> dict:
    field_results = []
    earned = 0.0

    for rule in HYGIENE_RULES:
        val = row.get(rule["field"], "?")
        passed, status_label, recommendation = rule["check"](val)
        if passed:
            earned += rule["weight"]

        field_results.append({
            "field":          rule["field"],
            "label":          rule["label"],
            "current_value":  str(val) if not pd.isna(val) else "—",
            "passed":         passed,
            "status_label":   status_label,
            "recommendation": recommendation,
            "weight":         rule["weight"],
        })

    score = round((earned / MAX_SCORE) * 10, 1)

    if score >= 8:
        severity, severity_label = "GOOD",     "Ticket is in good shape"
    elif score >= 5:
        severity, severity_label = "MODERATE", "Moderate attention required"
    else:
        severity, severity_label = "CRITICAL", "Critical attention required"

    # Failed fields ranked by weight (highest impact first)
    failed = sorted(
        [f for f in field_results if not f["passed"]],
        key=lambda x: x["weight"],
        reverse=True,
    )
    remediation_steps = [
        {"step": i + 1, "field": f["label"], "action": f["recommendation"]}
        for i, f in enumerate(failed[:5])
    ]

    # Synthesis text
    passed_count = sum(1 for f in field_results if f["passed"])
    synthesis = f"This ticket scored {score}/10, passing {passed_count} of {len(field_results)} hygiene checks. "
    if failed:
        top_issues = ", ".join(f["label"] for f in failed[:3])
        synthesis += (
            f"The most critical gaps are: {top_issues}. "
            "Addressing these will improve data completeness for SLA reporting, "
            "post-mortem analysis, and CMDB accuracy."
        )
    else:
        synthesis += "All checks passed. No immediate remediation required."

    # Resolution time
    resolution_time = "—"
    try:
        opened   = pd.to_datetime(row["opened_at"],  dayfirst=True)
        resolved = pd.to_datetime(row["resolved_at"], dayfirst=True)
        if pd.notna(opened) and pd.notna(resolved):
            h, rem = divmod(int((resolved - opened).total_seconds()), 3600)
            resolution_time = f"{h}h {rem // 60}m"
    except Exception:
        pass

    return {
        "ticket_id":      str(row["number"]),
        "score":          score,
        "score_display":  f"{score}/10",
        "severity":       severity,
        "severity_label": severity_label,
        "passed_count":   passed_count,
        "total_checks":   len(field_results),
        "synthesis":      synthesis,
        "snapshot": {
            "priority":        str(row.get("priority",    "—")),
            "assigned_to":     str(row.get("assigned_to", "Unassigned")) if not _is_missing(row.get("assigned_to")) else "Unassigned",
            "opened_at":       str(row.get("opened_at",  "—")),
            "resolution_time": resolution_time,
        },
        "field_results":     field_results,
        "remediation_steps": remediation_steps,
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def analyse_all(csv_path: str) -> list:
    df = pd.read_csv(csv_path)
    latest = (
        df.sort_values("sys_mod_count")
          .groupby("number", as_index=False)
          .last()
    )
    results = [analyse_ticket(row) for _, row in latest.iterrows()]
    results.sort(key=lambda x: x["score"])  # worst first
    return results


def main():
    parser = argparse.ArgumentParser(description="Ticket Hygiene Analyser — outputs JSON payload")
    parser.add_argument("--csv", default="incident_event_log.csv", help="Path to incident CSV")
    parser.add_argument("--out", default=None, help="Optional: write JSON to this file (default: stdout)")
    args = parser.parse_args()

    results = analyse_all(args.csv)
    payload = json.dumps(results, indent=2)

    if args.out:
        with open(args.out, "w", encoding="utf-8") as fh:
            fh.write(payload)
        print(f"JSON written to {args.out}")
    else:
        print(payload)


if __name__ == "__main__":
    main()