import frappe
from frappe.utils import add_to_date, nowdate, now_datetime as nowdatetime, get_datetime
from frappe.utils.safe_exec import get_safe_globals


@frappe.whitelist()
def get_child_table_fields(parent_doctype):
    """Return all Table-type fields from a given DocType (for Child Table Field dropdown)"""
    if not parent_doctype:
        return []
    try:
        meta = frappe.get_meta(parent_doctype)
        fields = [
            {"fieldname": f.fieldname, "label": f.label or f.fieldname, "options": f.options}
            for f in meta.fields if f.fieldtype == "Table" and f.options
        ]
        return fields
    except Exception as e:
        frappe.log_error(str(e), "get_child_table_fields error")
        return []


@frappe.whitelist()
def get_date_fields_for_doctype(child_doctype):
    """Return all Date/Datetime fields from a given child DocType"""
    if not child_doctype:
        return []
    try:
        meta = frappe.get_meta(child_doctype)
        fields = [
            {"fieldname": f.fieldname, "label": f.label or f.fieldname}
            for f in meta.fields if f.fieldtype in ("Date", "Datetime")
        ]
        return fields
    except Exception as e:
        frappe.log_error(str(e), "get_date_fields_for_doctype error")
        return []


def get_context(doc, row=None):
    """Context for evaluating conditions and Jinja templates"""
    context = {"doc": doc, "frappe": frappe}
    if row:
        context["row"] = row
    return context

def evaluate_condition(condition, doc, row=None):
    """Evaluate Python condition string"""
    if not condition:
        return True
    try:
        context = get_context(doc, row)
        return frappe.safe_eval(condition, None, context)
    except Exception as e:
        frappe.log_error(f"Error evaluating condition: {e}", "Child Notification Condition Error")
        return False

def render_template(template, doc, row=None):
    """Render Jinja template"""
    if not template:
        return ""
    try:
        context = get_context(doc, row)
        return frappe.render_template(template, context)
    except Exception as e:
        frappe.log_error(f"Error rendering template: {e}", "Child Notification Template Error")
        return str(e)

def get_recipients(rule, doc, row=None):
    """Determine recipients based on rule configuration"""
    recipients = set()

    if rule.document_owner:
        owner_email = frappe.db.get_value("User", doc.owner, "email")
        if owner_email:
            recipients.add(owner_email)

    if rule.user_field:
        # Check child first, then parent
        user = (row and row.get(rule.user_field)) or doc.get(rule.user_field)
        if user:
            user_email = frappe.db.get_value("User", user, "email")
            if user_email:
                recipients.add(user_email)

    if rule.email_field:
        email = (row and row.get(rule.email_field)) or doc.get(rule.email_field)
        if email:
            recipients.add(email)

    if rule.role_based:
        role_users = frappe.db.sql("""
            select email from `tabUser`
            where name in (
                select parent from `tabHas Role` where role = %s
            ) and enabled=1
        """, rule.role_based, as_dict=1)
        for u in role_users:
            if u.email:
                recipients.add(u.email)

    for specific_user in rule.get("specific_users"):
        email = frappe.db.get_value("User", specific_user.user, "email")
        if email:
            recipients.add(email)

    return list(recipients)

def log_exists(rule_name, parent_type, parent_name, row_name):
    """Check if notification was already sent or queued for this exact row and rule"""
    return frappe.db.exists(
        "Child Notification Log",
        {
            "notification_rule": rule_name,
            "parent_document_type": parent_type,
            "parent_document": parent_name,
            "child_row_name": row_name,
            "notification_status": ("in", ["Sent", "Pending"])
        }
    )

def create_log(rule_name, parent_type, parent_name, row_name, status):
    """Create a log entry to prevent duplicates"""
    log = frappe.get_doc({
        "doctype": "Child Notification Log",
        "notification_rule": rule_name,
        "parent_document_type": parent_type,
        "parent_document": parent_name,
        "child_row_name": row_name,
        "notification_date": nowdatetime(),
        "notification_status": status
    })
    log.insert(ignore_permissions=True)

def queue_notification(rule, doc, row, recipients):
    """Create a queue entry for background processing"""
    if not recipients:
        return

    # To prevent duplicates
    if log_exists(rule.name, doc.doctype, doc.name, row.name):
        return

    subject = render_template(rule.subject, doc, row)
    message = render_template(rule.message, doc, row)

    for recipient in recipients:
        queue = frappe.get_doc({
            "doctype": "Child Notification Queue",
            "rule": rule.name,
            "parent_doctype": doc.doctype,
            "parent_document": doc.name,
            "child_row_id": row.name,
            "recipient": recipient,
            "subject": subject,
            "message": message,
            "status": "Pending"
        })
        queue.insert(ignore_permissions=True)
    
    # Create log for the row
    create_log(rule.name, doc.doctype, doc.name, row.name, "Pending")


def evaluate_rule(rule, doc, event_type):
    """Evaluate a rule for a document on a specific event"""
    child_field = rule.child_table_field
    if not doc.get(child_field):
        return

    for row in doc.get(child_field):
        # Handle Date Based Reminders (Scheduler)
        if event_type == "Date Based Reminder" and rule.event_type == "Date Based Reminder":
            date_val = row.get(rule.date_field)
            if not date_val:
                continue

            date_val = get_datetime(date_val).date()
            today = get_datetime(nowdate()).date()

            diff_days = rule.days or 0
            if rule.date_condition == "Days Before":
                target_date = get_datetime(add_to_date(date_val, days=-diff_days)).date()
                if today != target_date:
                    continue
            elif rule.date_condition == "Days After":
                target_date = get_datetime(add_to_date(date_val, days=diff_days)).date()
                if today != target_date:
                    continue
            elif rule.date_condition == "On Exact Date":
                if today != date_val:
                    continue
            elif rule.date_condition == "Before Date":
                if today >= date_val:
                    continue
            elif rule.date_condition == "After Date":
                if today <= date_val:
                    continue

        # Check conditions
        if rule.condition:
            if not evaluate_condition(rule.condition, doc, row):
                continue

        recipients = get_recipients(rule, doc, row)
        if recipients:
            queue_notification(rule, doc, row, recipients)


def process_document_events(doc, method):
    """Hooked to all doc events globally"""
    if frappe.flags.in_import or frappe.flags.in_patch:
        return

    # Map hook methods to Event Type
    event_map = {
        "before_save": "Before Save",
        "after_save": "After Save",
        "on_submit": "Submit",
        "on_cancel": "Cancel"
    }
    
    event_type = event_map.get(method)
    if not event_type:
        return

    rules = frappe.get_all(
        "Child Table Notification Rule",
        filters={"parent_doctype": doc.doctype, "enabled": 1, "event_type": event_type}
    )

    if not rules:
        return

    for r in rules:
        rule = frappe.get_doc("Child Table Notification Rule", r.name)
        evaluate_rule(rule, doc, event_type)


def process_scheduler(event_type):
    """Process Date Based Reminders or Daily/Hourly events"""
    rules = frappe.get_all(
        "Child Table Notification Rule",
        filters={"enabled": 1, "event_type": event_type}
    )

    for r in rules:
        rule = frappe.get_doc("Child Table Notification Rule", r.name)
        
        # If it's a date based reminder, we need to iterate over all valid parent documents.
        # This can be expensive if not filtered. We try to fetch parents that have children.
        if rule.event_type == "Date Based Reminder":
            # For date based reminders, we have to look up the child table to find matches.
            child_table = rule.child_doctype
            if not child_table:
                continue

            # Query child table for matching dates
            filters = {}
            if rule.date_condition == "On Exact Date":
                filters[rule.date_field] = ("like", f"{nowdate()}%")
            
            # Fetch parents dynamically
            parents = frappe.db.sql(f"select distinct parent from `tab{child_table}`", as_dict=True)
            for p in parents:
                parent_doc = frappe.get_doc(rule.parent_doctype, p.parent)
                evaluate_rule(rule, parent_doc, "Date Based Reminder")
        else:
            # For Daily Scheduler / Hourly Scheduler
            docs = frappe.get_all(rule.parent_doctype)
            for d in docs:
                parent_doc = frappe.get_doc(rule.parent_doctype, d.name)
                evaluate_rule(rule, parent_doc, rule.event_type)

def process_daily_scheduler():
    process_scheduler("Daily Scheduler")
    process_scheduler("Date Based Reminder")

def process_hourly_scheduler():
    process_scheduler("Hourly Scheduler")

def process_notification_queue():
    """Background job to send queued notifications"""
    queue_items = frappe.get_all(
        "Child Notification Queue",
        filters={"status": "Pending"},
        limit=50
    )

    for item in queue_items:
        queue = frappe.get_doc("Child Notification Queue", item.name)
        queue.db_set("status", "Processing")

        try:
            frappe.sendmail(
                recipients=queue.recipient,
                subject=queue.subject,
                message=queue.message,
                reference_doctype=queue.parent_doctype,
                reference_name=queue.parent_document
            )
            queue.db_set("status", "Sent")
            queue.db_set("sent_time", nowdatetime())

            # Update Log status
            frappe.db.sql("""
                update `tabChild Notification Log`
                set notification_status = 'Sent'
                where notification_rule = %s and parent_document = %s and child_row_name = %s
            """, (queue.rule, queue.parent_document, queue.child_row_id))

        except Exception as e:
            queue.db_set("error_message", str(e))
            retry_count = queue.retry_count + 1
            queue.db_set("retry_count", retry_count)
            if retry_count >= 3:
                queue.db_set("status", "Failed")
                
                # Update Log status
                frappe.db.sql("""
                    update `tabChild Notification Log`
                    set notification_status = 'Failed'
                    where notification_rule = %s and parent_document = %s and child_row_name = %s
                """, (queue.rule, queue.parent_document, queue.child_row_id))
            else:
                queue.db_set("status", "Pending")
        
        frappe.db.commit()
