import frappe
from frappe.utils import today, add_days, getdate, nowdate

@frappe.whitelist()
def get_lead_tasks(selected_date=None):
    if not selected_date:
        selected_date = today()
        
    selected_date_obj = getdate(selected_date)
    next_7_days = add_days(selected_date, 7)
    
    # ---- Permission-based Sales Person filter ----
    # Administrator sees everything; other users see only their own tasks
    user = frappe.session.user
    allowed_sales_persons = get_allowed_sales_persons(user)
    
    # Build base filters
    base_filters = {"task_status": ["not in", ["Completed", "Cancelled"]]}
    if allowed_sales_persons is not None:
        # None means no restriction (Administrator)
        # Empty list means user has no sales person — show nothing
        if not allowed_sales_persons:
            return {
                "summary": {"total": 0, "today": 0, "next_7_days": 0, "overdue": 0},
                "today_tasks": [],
                "next_7_days_tasks": [],
                "overdue_tasks": []
            }
        base_filters["link_lvha"] = ["in", allowed_sales_persons]
    
    # 1. All open tasks count
    total_open_tasks = frappe.db.count("Lead Contact Person Tasks", filters=base_filters)
    
    actual_today = today()
    
    fields = ["name", "title", "date", "time", "type", "priority", "task_status",
              "lead_contact_person", "designation", "crm_lead_company", "description", "link_lvha"]
    
    # 2. Today's Tasks
    if getdate(selected_date) < getdate(actual_today):
        todays_tasks = []
    else:
        today_filters = dict(base_filters)
        today_filters["date"] = selected_date
        todays_tasks = frappe.get_all("Lead Contact Person Tasks", 
            filters=today_filters,
            fields=fields,
            order_by="time asc"
        )
    todays_tasks_count = len(todays_tasks)
    
    # 3. Next 7 Days Tasks
    start_next_7 = getdate(add_days(selected_date, 1))
    if start_next_7 < getdate(actual_today):
        start_next_7 = getdate(actual_today)
        
    if start_next_7 > getdate(next_7_days):
        next_7_days_tasks = []
    else:
        next7_filters = dict(base_filters)
        next7_filters["date"] = ["between", [start_next_7, next_7_days]]
        next_7_days_tasks = frappe.get_all("Lead Contact Person Tasks", 
            filters=next7_filters,
            fields=fields,
            order_by="date asc, time asc"
        )
    next_7_days_count = len(next_7_days_tasks)
    
    # 4. Overdue Tasks
    overdue_filters = dict(base_filters)
    overdue_filters["date"] = ["<", actual_today]
    overdue_tasks = frappe.get_all("Lead Contact Person Tasks",
        filters=overdue_filters,
        fields=fields,
        order_by="date desc, time asc"
    )
    overdue_tasks_count = len(overdue_tasks)
    
    return {
        "summary": {
            "total": total_open_tasks,
            "today": todays_tasks_count,
            "next_7_days": next_7_days_count,
            "overdue": overdue_tasks_count
        },
        "today_tasks": todays_tasks,
        "next_7_days_tasks": next_7_days_tasks,
        "overdue_tasks": overdue_tasks
    }


def get_allowed_sales_persons(user):
    """
    Returns a list of Sales Person names the user is allowed to see.
    Returns None if the user is Administrator (no restriction).
    Returns empty list if user has no linked Sales Person.
    
    Logic:
    1. Administrator → None (see all)
    2. Find Sales Person linked via Employee (Employee.user_id → Sales Person.employee)
    3. Also check User Permissions for 'Sales Person' doctype for additional access
    4. Combine both and return unique list
    """
    if user == "Administrator":
        return None
    
    allowed = set()
    
    # 1. Find Sales Person linked to the user via Employee
    #    User → Employee (user_id) → Sales Person (employee)
    employee = frappe.db.get_value("Employee", {"user_id": user}, "name")
    if employee:
        sales_persons = frappe.db.get_all("Sales Person",
            filters={"employee": employee, "enabled": 1},
            pluck="name"
        )
        allowed.update(sales_persons)
    
    # 2. Check User Permissions for 'Sales Person' — gives access to other sales persons
    user_perms = frappe.db.get_all("User Permission",
        filters={"user": user, "allow": "Sales Person"},
        pluck="for_value"
    )
    allowed.update(user_perms)
    
    return list(allowed)
