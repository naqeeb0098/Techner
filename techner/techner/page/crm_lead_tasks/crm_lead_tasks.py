import frappe
from frappe.utils import today, add_days, getdate, nowdate

@frappe.whitelist()
def get_lead_tasks(selected_date=None):
    if not selected_date:
        selected_date = today()
        
    selected_date_obj = getdate(selected_date)
    next_7_days = add_days(selected_date, 7)
    
    # Base query for all open tasks
    base_conditions = "task_status not in ('Completed', 'Cancelled')"
    
    # 1. All open tasks count
    total_open_tasks = frappe.db.count("Lead Contact Person Tasks", filters={"task_status": ["not in", ["Completed", "Cancelled"]]})
    
    actual_today = today()
    
    # 2. Today's Tasks
    if getdate(selected_date) < getdate(actual_today):
        todays_tasks = []
    else:
        todays_tasks = frappe.get_all("Lead Contact Person Tasks", 
            filters={"date": selected_date, "task_status": ["not in", ["Completed", "Cancelled"]]},
            fields=["name", "title", "date", "time", "type", "priority", "task_status", "lead_contact_person", "designation", "crm_lead_company", "description", "link_lvha"],
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
        next_7_days_tasks = frappe.get_all("Lead Contact Person Tasks", 
            filters={
                "date": ["between", [start_next_7, next_7_days]],
                "task_status": ["not in", ["Completed", "Cancelled"]]
            },
            fields=["name", "title", "date", "time", "type", "priority", "task_status", "lead_contact_person", "designation", "crm_lead_company", "description", "link_lvha"],
            order_by="date asc, time asc"
        )
    next_7_days_count = len(next_7_days_tasks)
    
    # 4. Overdue Tasks
    overdue_tasks = frappe.get_all("Lead Contact Person Tasks",
        filters={
            "date": ["<", actual_today],
            "task_status": ["not in", ["Completed", "Cancelled"]]
        },
        fields=["name", "title", "date", "time", "type", "priority", "task_status", "lead_contact_person", "designation", "crm_lead_company", "description", "link_lvha"],
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
