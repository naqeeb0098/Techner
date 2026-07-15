import frappe
from frappe.utils import nowdate, get_datetime, add_to_date, now_datetime


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def get_child_field_type(notification_doc):
    """
    notification_doc.custom_child_table_field ki actual fieldtype return karo.
    Child doctype name: custom_child_doctype field ki options se milega.
    """
    try:
        parent_doctype = notification_doc.document_type
        child_table_fieldname = notification_doc.custom_child_doctype  # e.g. "items"
        child_field_to_watch = notification_doc.custom_child_table_field  # e.g. "delivery_date"

        if not parent_doctype or not child_table_fieldname or not child_field_to_watch:
            return None

        parent_meta = frappe.get_meta(parent_doctype)
        table_df = next(
            (f for f in parent_meta.fields if f.fieldname == child_table_fieldname and f.fieldtype in ("Table", "Table MultiSelect")),
            None
        )
        if not table_df or not table_df.options:
            return None

        child_meta = frappe.get_meta(table_df.options)
        watched_df = next(
            (f for f in child_meta.fields if f.fieldname == child_field_to_watch),
            None
        )
        if not watched_df:
            return None

        return watched_df.fieldtype  # e.g. "Date", "Datetime", "Data", "Link", etc.

    except Exception as e:
        frappe.log_error(str(e), "get_child_field_type Error")
        return None


def get_child_doctype_name(notification_doc):
    """
    custom_child_doctype field mein fieldname stored hai (e.g. "items").
    Us se actual child doctype name (e.g. "Sales Order Item") milega.
    """
    try:
        parent_meta = frappe.get_meta(notification_doc.document_type)
        table_df = next(
            (f for f in parent_meta.fields if f.fieldname == notification_doc.custom_child_doctype),
            None
        )
        return table_df.options if table_df else None
    except Exception:
        return None


def log_already_sent(notification_name, parent_doctype, parent_name, row_name):
    """Check karo ke is row ke liye aaj notification pehle se bheji ja chuki hai."""
    return frappe.db.exists("Child Notification Log", {
        "notification_rule": notification_name,
        "parent_document_type": parent_doctype,
        "parent_document": parent_name,
        "child_row_name": row_name,
        "notification_status": ("in", ["Sent", "Pending"])
    })


def create_log(notification_name, parent_doctype, parent_name, row_name, status="Sent"):
    frappe.get_doc({
        "doctype": "Child Notification Log",
        "notification_rule": notification_name,
        "parent_document_type": parent_doctype,
        "parent_document": parent_name,
        "child_row_name": row_name,
        "notification_date": now_datetime(),
        "notification_status": status
    }).insert(ignore_permissions=True)


def render_and_send(notification_doc, parent_doc, row):
    """
    Notification ka subject/message Jinja render karo (doc + row context)
    aur email bhejo recipients ko.
    """
    context = {"doc": parent_doc, "row": row, "frappe": frappe}

    subject = frappe.render_template(notification_doc.subject or "", context)
    message = frappe.render_template(notification_doc.message or "", context)

    # Recipients: Notification doctype ke recipients table se
    recipients = []
    for r in notification_doc.recipients:
        if r.receiver_by_document_field:
            email = parent_doc.get(r.receiver_by_document_field) or (row and row.get(r.receiver_by_document_field))
            if email:
                recipients.append(email)
        if r.receiver_by_role:
            role_users = frappe.db.sql("""
                SELECT u.email FROM `tabUser` u
                INNER JOIN `tabHas Role` hr ON hr.parent = u.name
                WHERE hr.role = %s AND u.enabled = 1 AND u.email != ''
            """, r.receiver_by_role, as_dict=1)
            recipients.extend([u.email for u in role_users if u.email])

    if not recipients:
        return

    try:
        frappe.sendmail(
            recipients=list(set(recipients)),
            subject=subject,
            message=message,
            reference_doctype=parent_doc.doctype,
            reference_name=parent_doc.name
        )
    except Exception as e:
        frappe.log_error(str(e), f"Child Notification Send Error [{notification_doc.name}]")


# ─────────────────────────────────────────────
# CORE: Process a single notification against a parent doc + its child rows
# ─────────────────────────────────────────────

def process_notification_for_doc(notification_doc, parent_doc, check_date=False):
    """
    Ek notification_doc ke against parent_doc ki child table rows iterate karo.
    check_date=True hone par date comparison karo (scheduler use karta hai).
    """
    child_fieldname = notification_doc.custom_child_doctype  # fieldname in parent e.g. "items"
    child_field_to_watch = notification_doc.custom_child_table_field
    event_type = notification_doc.custom_event_type

    rows = parent_doc.get(child_fieldname) or []
    if not rows:
        return

    field_type = get_child_field_type(notification_doc)
    is_date_field = field_type in ("Date", "Datetime")

    today = get_datetime(nowdate()).date()

    for row in rows:
        # ── Date field check (for scheduler events) ──
        if check_date and is_date_field:
            date_val = row.get(child_field_to_watch)
            if not date_val:
                continue

            try:
                row_date = get_datetime(date_val).date()
            except Exception:
                continue

            # Date Based Reminder logic
            if event_type == "Date Based Reminder":
                # Exact match: sirf aaj ki date waali rows
                if row_date != today:
                    continue
            elif event_type in ("Daily Scheduler", "Hourly Scheduler"):
                # Scheduler se date wali row: sirf aaj ki date
                if row_date != today:
                    continue

        elif check_date and not is_date_field:
            # Non-date field, scheduler ne bulaya — condition check karo
            if notification_doc.condition:
                try:
                    if not frappe.safe_eval(notification_doc.condition, None, {"doc": parent_doc, "row": row, "frappe": frappe}):
                        continue
                except Exception as e:
                    frappe.log_error(str(e), "Notification Condition Eval Error")
                    continue

        # Duplicate check
        if log_already_sent(notification_doc.name, parent_doc.doctype, parent_doc.name, row.name):
            continue

        # Send notification
        render_and_send(notification_doc, parent_doc, row)

        # Log karo
        create_log(notification_doc.name, parent_doc.doctype, parent_doc.name, row.name)


# ─────────────────────────────────────────────
# DOC EVENTS HOOK (after_save, on_submit, on_cancel)
# ─────────────────────────────────────────────

# Frappe event → custom_event_type options mapping
EVENT_MAP = {
    "after_save": "After Save",
    "before_save": "Before Save",
    "on_submit": "Submit",
    "on_cancel": "Cancel",
}


def process_notification_doc_event(doc, method):
    """
    Frappe doc_events hook.
    Har save/submit/cancel pe check karo ke koi Notification
    is doctype ke liye custom_enable_notification_for_child=1 ke saath exist karti hai.
    """
    if frappe.flags.in_import or frappe.flags.in_patch or frappe.flags.in_install:
        return

    mapped_event = EVENT_MAP.get(method)
    if not mapped_event:
        return

    notifications = frappe.get_all(
        "Notification",
        filters={
            "enabled": 1,
            "document_type": doc.doctype,
            "custom_enable_notification_for_child": 1,
            "custom_event_type": mapped_event,
        },
        fields=["name"]
    )

    if not notifications:
        return

    for n in notifications:
        try:
            notif_doc = frappe.get_doc("Notification", n.name)
            if not notif_doc.custom_child_doctype or not notif_doc.custom_child_table_field:
                continue
            process_notification_for_doc(notif_doc, doc, check_date=False)
        except Exception as e:
            frappe.log_error(str(e), f"Doc Event Notification Error [{n.name}]")


# ─────────────────────────────────────────────
# SCHEDULER HOOKS
# ─────────────────────────────────────────────

def _run_scheduler_notifications(event_type_label):
    """
    Scheduler se chalao: event_type_label = 'Daily Scheduler' ya 'Hourly Scheduler' ya 'Date Based Reminder'
    """
    notifications = frappe.get_all(
        "Notification",
        filters={
            "enabled": 1,
            "custom_enable_notification_for_child": 1,
            "custom_event_type": event_type_label,
        },
        fields=["name", "document_type"]
    )

    if not notifications:
        return

    for n in notifications:
        try:
            notif_doc = frappe.get_doc("Notification", n.name)
            if not notif_doc.custom_child_doctype or not notif_doc.custom_child_table_field:
                continue

            # Sare parent docs fetch karo is doctype ke
            parent_docs = frappe.get_all(notif_doc.document_type, fields=["name"])

            for pd in parent_docs:
                try:
                    parent_doc = frappe.get_doc(notif_doc.document_type, pd.name)
                    process_notification_for_doc(notif_doc, parent_doc, check_date=True)
                except Exception as e:
                    frappe.log_error(str(e), f"Scheduler Notification Error [{notif_doc.name} | {pd.name}]")

        except Exception as e:
            frappe.log_error(str(e), f"Scheduler Notification Outer Error [{n.name}]")


def process_notification_daily():
    """Daily scheduler hook"""
    _run_scheduler_notifications("Daily Scheduler")
    _run_scheduler_notifications("Date Based Reminder")


def process_notification_hourly():
    """Hourly scheduler hook"""
    _run_scheduler_notifications("Hourly Scheduler")
