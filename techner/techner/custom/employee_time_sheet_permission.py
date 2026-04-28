import frappe

def get_permission_query_conditions(user):
	if not user:
		user = frappe.session.user

	if user == 'Administrator':
		return ""

	# If state is 'Pending', only show to the employee themselves or the owner.
	# We check both possible workflow state fields found in the DB.
	return """(
		(IFNULL(`tabEmployee Time Sheet`.employee_workflow_state, '') != 'Pending' AND IFNULL(`tabEmployee Time Sheet`.employee_workflow_state_2, '') != 'Pending') OR 
		(`tabEmployee Time Sheet`.employee_email = {user} OR `tabEmployee Time Sheet`.owner = {user})
	)""".format(user=frappe.db.escape(user))

def has_permission(doc, ptype, user):
	if not user:
		user = frappe.session.user

	if user == 'Administrator':
		return True

	# Check both fields for 'Pending'
	state1 = doc.get('employee_workflow_state')
	state2 = doc.get('employee_workflow_state_2')
	
	if state1 == 'Pending' or state2 == 'Pending':
		employee_email = doc.get('employee_email')
		owner = doc.owner

		if employee_email != user and owner != user:
			return False

	return None
