frappe.listview_settings["Application Form"] = frappe.listview_settings["Application Form"] || {};

let og_onload_app = frappe.listview_settings["Application Form"].onload;

frappe.listview_settings["Application Form"].onload = function (listview) {
	if (og_onload_app) og_onload_app(listview);

	let $search_wrapper = $(`
		<div class="resume-search-wrapper" style="display: inline-flex; gap: 8px; margin-right: 15px;">
			<input type="text" class="form-control input-sm" placeholder="Resume Search1" style="width: 140px;">
			<input type="text" class="form-control input-sm" placeholder="Resume Search1" style="width: 140px;">
			<input type="text" class="form-control input-sm" placeholder="Resume Search1" style="width: 140px;">
		</div>
	`);

	// Prepend to page actions area so it displays nicely next to buttons
	listview.page.wrapper.find('.page-actions').prepend($search_wrapper);

	let $search_inputs = $search_wrapper.find('input');

	// Handle typing / enter / blur to trigger filter
	$search_inputs.on('change', function () {
		// Remove existing resume_extraction filters
		if (listview.filter_area.filter_list && listview.filter_area.filter_list.filters) {
			let existing_filters = listview.filter_area.filter_list.filters.filter(f => f.fieldname === 'resume_extraction');
			existing_filters.forEach(f => f.remove());
		}

		let filters_to_add = [];
		$search_inputs.each(function () {
			let val = $(this).val();
			if (val && val.trim()) {
				val = '%' + val.trim() + '%';
				filters_to_add.push(['Application Form', 'resume_extraction', 'like', val]);
			}
		});

		if (filters_to_add.length > 0) {
			listview.filter_area.add(filters_to_add);
		} else {
			listview.refresh();
		}
	});
};
