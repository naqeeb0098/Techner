import frappe

def get_permission_query_conditions(user):
	if not user:
		user = frappe.session.user

	if user == 'Administrator':
		return ""

	# If employee_workflow_state is 'Pending', only show to the employee themselves.
	# custom_employee_email stores the user ID of the employee.
	# owner is the creator of the record.
	
	return """(
		(IFNULL(employee_workflow_state, '') != 'Pending') OR 
		(custom_employee_email = {user} OR owner = {user})
	)""".format(user=frappe.db.escape(user))

def has_permission(doc, ptype, user):
	if not user:
		user = frappe.session.user

	if user == 'Administrator':
		return True

	state = doc.get('employee_workflow_state')
	if state == 'Pending':
		employee_email = doc.get('custom_employee_email')
		owner = doc.owner
		
		if employee_email != user and owner != user:
			return False

	return None
