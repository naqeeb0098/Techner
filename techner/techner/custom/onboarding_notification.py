"""
On Boarding Tracker - Daily Date Notification Job
==================================================
Daily basis par chalti hai. 
Kaam:
  1. Frappe Notification templates fetch karo jahan custom_enable_on_boarding_tracker_child = 1
  2. Har On Boarding Tracker record ke Phase 1 aur Phase 2 child rows check karo
  3. Agar row.date == aaj ki date ho:
     - Notification template fire karo us record ke liye
     - row.email_sent = 1 mark karo (duplicate prevention)
  4. Agar date match nahi ya email_sent already 1 hai to skip karo
"""
import frappe
from frappe.utils import nowdate, getdate
from frappe.email.doctype.notification.notification import evaluate_alert

@frappe.whitelist(allow_guest=True)
def send_onboarding_tracker_notifications():
    """
    Daily scheduler job:
    Fire Notification templates (with custom_enable_on_boarding_tracker_child=1)
    for On Boarding Tracker rows whose date matches today.
    """
    if frappe.flags.in_import or frappe.flags.in_patch:
        return

    today = getdate(nowdate())

    # Step 1: Get all enabled Notification templates with the custom flag ON
    notifications = frappe.get_all(
        "Notification",
        filters={
            "enabled": 1,
            "custom_enable_on_boarding_tracker_child": 1
        },
        fields=["name"]
    )

    if not notifications:
        frappe.logger().info("OnBoarding Notification: No active notification templates found.")
        return

    # Step 2: Get all On Boarding Tracker records
    trackers = frappe.get_all("On Boarding Tracker", fields=["name"])

    if not trackers:
        return

    for tracker_row in trackers:
        doc = frappe.get_doc("On Boarding Tracker", tracker_row.name)

        # Check Phase 1 rows (table field: phase_1, child doctype: Onboarding Tracker Details P1)
        for row in doc.phase_1:
            if not row.date:
                continue
            if row.email_sent:
                continue  # Already sent, skip
            if getdate(row.date) != today:
                continue  # Date doesn't match today, skip

            # Date matches today — fire all matching notification templates
            for notif in notifications:
                try:
                    evaluate_alert(doc, notif.name, "Days After")
                    # Mark email_sent = 1 on the child row to prevent duplicate
                    frappe.db.set_value(
                        "Onboarding Tracker Details P1",
                        row.name,
                        "email_sent", 1
                    )
                    frappe.logger().info(
                        f"OnBoarding Notification sent: {notif.name} | "
                        f"Tracker: {doc.name} | Phase 1 Row: {row.name} | Date: {row.date}"
                    )
                except Exception as e:
                    frappe.log_error(
                        message=frappe.get_traceback(),
                        title=f"OnBoarding Notification Error | {notif.name} | {doc.name} | P1 Row {row.name}"
                    )

        # Check Phase 2 rows (table field: table_ikva, child doctype: Onboarding Tracker details)
        for row in doc.table_ikva:
            if not row.date:
                continue
            if row.email_sent:
                continue  # Already sent, skip
            if getdate(row.date) != today:
                continue  # Date doesn't match today, skip

            # Date matches today — fire all matching notification templates
            for notif in notifications:
                try:
                    evaluate_alert(doc, notif.name, "Days After")
                    # Mark email_sent = 1 on the child row
                    frappe.db.set_value(
                        "Onboarding Tracker details",
                        row.name,
                        "email_sent", 1
                    )
                    frappe.logger().info(
                        f"OnBoarding Notification sent: {notif.name} | "
                        f"Tracker: {doc.name} | Phase 2 Row: {row.name} | Date: {row.date}"
                    )
                except Exception as e:
                    frappe.log_error(
                        message=frappe.get_traceback(),
                        title=f"OnBoarding Notification Error | {notif.name} | {doc.name} | P2 Row {row.name}"
                    )

        frappe.db.commit()
