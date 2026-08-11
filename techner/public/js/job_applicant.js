frappe.ui.form.on('Job Applicant', {
	onload: function(frm) {
		// Restrict resume_attachment to only accept PDF files
		frm.set_df_property('resume_attachment', 'options', {
			restrictions: {
				allowed_file_types: ['.pdf']
			}
		});
	}
});
