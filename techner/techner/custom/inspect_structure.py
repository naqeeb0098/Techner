import frappe

def inspect_child_tables():
    # Phase 1 child table
    print("=== Onboarding Tracker Details P1 Fields ===")
    try:
        meta = frappe.get_meta("Onboarding Tracker Details P1")
        for f in meta.fields:
            if f.fieldtype not in ("Section Break", "Column Break", "HTML"):
                print(f"  [{f.fieldtype}] {f.fieldname} | label: {f.label}")
    except Exception as e:
        print(f"  ERROR: {e}")

    # Phase 2 child table
    print("\n=== Onboarding Tracker details Fields ===")
    try:
        meta = frappe.get_meta("Onboarding Tracker details")
        for f in meta.fields:
            if f.fieldtype not in ("Section Break", "Column Break", "HTML"):
                print(f"  [{f.fieldtype}] {f.fieldname} | label: {f.label}")
    except Exception as e:
        print(f"  ERROR: {e}")

    # Check sample record
    print("\n=== Sample On Boarding Tracker Record ===")
    records = frappe.get_all("On Boarding Tracker", limit=1)
    if records:
        doc = frappe.get_doc("On Boarding Tracker", records[0].name)
        print(f"  Doc: {doc.name}")
        print(f"  phase_1_date: {doc.phase_1_date}")
        print(f"  initiate_date: {doc.initiate_date}")
        print(f"  phase_1 rows: {len(doc.phase_1)}")
        print(f"  table_ikva rows: {len(doc.table_ikva)}")
