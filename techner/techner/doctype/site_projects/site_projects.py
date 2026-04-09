# Copyright (c) 2026, Naqeeb Khan and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class SiteProjects(Document):
	def on_update(self):
		self.sync_deleted_site_trackers()
		self.create_site_trackers()
		self.sync_milestones_to_trackers()

	def on_trash(self):
		self.delete_all_site_trackers()

	def sync_deleted_site_trackers(self):
		if self.is_new():
			return

		old_doc = self.get_doc_before_save()
		if not old_doc:
			return

		current_trackers = [row.site_tracker for row in self.get("projects_site_details") if row.site_tracker]
		for old_row in old_doc.get("projects_site_details"):
			if old_row.site_tracker and old_row.site_tracker not in current_trackers:
				if frappe.db.exists("Site Tracker", old_row.site_tracker):
					frappe.delete_doc("Site Tracker", old_row.site_tracker, ignore_permissions=True)

	def create_site_trackers(self):
		for row in self.get("projects_site_details"):
			if not row.site_tracker and row.site:
				# Create Site Tracker
				tracker = frappe.new_doc("Site Tracker")
				tracker.project = self.name
				tracker.site = row.site
				
				tracker.insert(ignore_permissions=True)
				
				# Update the site_tracker reference in the child table row without triggering save on parent
				row.db_set("site_tracker", tracker.name)
				row.site_tracker = tracker.name # Set it on current object to sync subsequently

	def sync_milestones_to_trackers(self):
		milestones_data = []
		for milestone in self.get("project_details_milestone"):
			milestones_data.append({
				"project_milestone": milestone.project_milestone,
				"status": milestone.status,
				"forcast": milestone.forcast,
				"actual": milestone.actual,
				"remarks": milestone.remarks,
				"assign_to": milestone.assign_to
			})

		for row in self.get("projects_site_details"):
			if row.site_tracker and frappe.db.exists("Site Tracker", row.site_tracker):
				tracker = frappe.get_doc("Site Tracker", row.site_tracker)
				
				# Clear existing milestones
				tracker.set("table_xyls", [])
				
				# Populate with new milestones from project
				for m_data in milestones_data:
					tracker.append("table_xyls", m_data)
				
				tracker.save(ignore_permissions=True)

	def delete_all_site_trackers(self):
		for row in self.get("projects_site_details"):
			if row.site_tracker and frappe.db.exists("Site Tracker", row.site_tracker):
				frappe.delete_doc("Site Tracker", row.site_tracker, ignore_permissions=True)
