import frappe

@frappe.whitelist()
def get_board_data(filters=None):
    import json
    if filters:
        filters = json.loads(filters)
    else:
        filters = {}

    # Build DB filters for Site Projects
    project_filters = {}
    if filters.get("project"):
        project_filters["name"] = filters.get("project")

    projects = frappe.get_all("Site Projects", filters=project_filters, fields=["name", "project_id"])
    
    data = []
    milestone_names = set()

    for p in projects:
        # Get sites for this project
        site_filters = {"parent": p.name}
        if filters.get("site"):
            site_filters["site"] = filters.get("site")

        sites = frappe.get_all("Site Projects Site Details", 
                               filters=site_filters, 
                               fields=["site", "site_name", "site_tracker"])
        
        for site in sites:
            row = {
                "project": p.name,
                "project_id": p.project_id,
                "site": site.site,
                "site_name": site.site_name,
                "site_tracker": site.site_tracker,
                "milestones": {}
            }
            
            # If site tracker exists, get its milestone details
            # We fetch all, and apply "assign_to" filter conceptually by hiding columns or just keep record
            if site.site_tracker:
                milestones = frappe.get_all("Site Tracker Milestone Details", 
                                            filters={"parent": site.site_tracker}, 
                                            fields=["name", "project_milestone", "status", "forcast", "actual", "remarks", "assign_to"])
                
                # Check Assign To Filter
                has_matched_user = False if filters.get("assign_to") else True

                for m in milestones:
                    m_name = m.project_milestone
                    if m_name:
                        milestone_names.add(m_name)
                        row["milestones"][m_name] = m
                        if filters.get("assign_to") and m.assign_to == filters.get("assign_to"):
                            has_matched_user = True
                            
                # If a user is selected and NO milestone matches this user on this project-site, skip row
                if not has_matched_user:
                    continue
            else:
                if filters.get("assign_to"):
                    # user filter active but no tracker
                    continue

            data.append(row)

    # Fetch users for dropdown (include full_name for searchable display)
    users = frappe.get_all("User", filters={"enabled": 1, "user_type": "System User"}, fields=["name", "full_name"])

    return {
        "data": data,
        "milestones": sorted(list(milestone_names)),
        "users": [{"name": u.name, "full_name": u.full_name or u.name} for u in users],
    }

@frappe.whitelist()
def update_milestone_field(site_tracker, milestone_row_name, field, value):
    if not frappe.has_permission("Site Tracker", "write"):
        frappe.throw("Not permitted")
        
    doc = frappe.get_doc("Site Tracker", site_tracker)
    for row in doc.table_xyls:
        if row.name == milestone_row_name:
            row.set(field, value)
            break
            
    doc.save(ignore_permissions=True)
    return "success"
