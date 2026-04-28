import frappe
from frappe.model.document import Document
from frappe.utils import get_url

class BasicIdFormEmails(Document):
	def validate(self):
		if self.send_email:
			self.send_emails_to_details()
			# Optionally uncheck send_email after sending to prevent multiple sends
			self.send_email = 0

	def send_emails_to_details(self):
		if not self.email_template:
			frappe.throw("Please select an Email Template (Notification Template) first.")

		if not self.emails_details:
			frappe.throw("Please add at least one email in the Emails Details table.")

		notification = frappe.get_doc("Notification", self.email_template)
		
		# Get sender from notification template
		sender = notification.sender_email or frappe.session.user

		for row in self.emails_details:
			# Only send if email is present and not already sent
			if row.email and not row.email_sent:
				# Render subject and message using the template and current doc as context
				subject = frappe.render_template(notification.subject, {"doc": self})
				message = frappe.render_template(notification.message, {"doc": self})

				frappe.sendmail(
					recipients=[row.email],
					sender=sender,
					subject=subject,
					content=message,
					now=True # Send immediately
				)
				
				# Mark as sent in the child table
				row.email_sent = 1
		
		frappe.msgprint("Emails have been sent successfully to the  recipients.")
