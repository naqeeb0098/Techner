frappe.pages['site-tracker-board'].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Site Projects Dashboard',
		single_column: true
	});

	// Setup Filters
	let project_filter = page.add_field({ fieldtype: 'Link', fieldname: 'project', options: 'Site Projects', label: 'Project', change: function () { render_board(); } });
	let site_filter = page.add_field({ fieldtype: 'Link', fieldname: 'site', options: 'Site', label: 'Site', change: function () { render_board(); } });
	let user_filter = page.add_field({ fieldtype: 'Link', fieldname: 'assign_to', options: 'User', label: 'Assign To', change: function () { render_board(); } });

	page.main.append('<div id="board-container" style="overflow-x: auto; max-height: 80vh; padding: 15px; margin-top: 10px;"></div>');

	let app_users = [];
	let app_statuses = [];
	let app_status_colors = {};

	const colors = [
		{ bg: '#00A8CC', text: '#fff' }, // Cyan
		{ bg: '#FFB800', text: '#000' }, // Yellow
		{ bg: '#0070F3', text: '#fff' }, // Blue
		{ bg: '#4CAF50', text: '#fff' }, // Green
		{ bg: '#E91E63', text: '#fff' }, // Pink
		{ bg: '#9C27B0', text: '#fff' }, // Purple
		{ bg: '#FF5722', text: '#fff' }, // Orange
		{ bg: '#607D8B', text: '#fff' }  // Grey
	];

	function get_filters() {
		return {
			project: project_filter.get_value(),
			site: site_filter.get_value(),
			assign_to: user_filter.get_value()
		};
	}

	function render_board() {
		page.main.find('#board-container').html('<div class="text-muted"><i class="fa fa-spinner fa-spin"></i> Loading data...</div>');

		frappe.call({
			method: 'techner.techner.page.site_tracker_board.site_tracker_board.get_board_data',
			args: { filters: JSON.stringify(get_filters()) },
			callback: function (r) {
				if (r.message) {
					app_users = r.message.users || [];
					app_statuses = r.message.statuses || [];
					app_status_colors = r.message.status_colors || {};
					draw_table(r.message.data, r.message.milestones);
				}
			}
		});
	}

	function get_status_color(status) {
		if (!status) return '#e2e8f0';
		return app_status_colors[status] || '#2E6DA4';
	}

	function draw_table(data, milestones) {
		let html = '<style>';
		html += '#tracker-board-table { border-collapse: collapse; width: 100%; font-size: 13px; font-family: "Inter", sans-serif; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }';
		html += '#tracker-board-table th, #tracker-board-table td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; vertical-align: middle; white-space: nowrap; height: 35px; }';
		html += '#tracker-board-table thead th { position: sticky; top: 0; z-index: 2; font-weight: 600; }';
		html += '#tracker-board-table thead tr:nth-child(2) th { top: 35px; }'; /* Subheader sticky offset */
		html += '.ms-header { text-align: center !important; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }';
		html += '.board-input { border: 1px solid transparent; width: 100%; min-width: 90px; padding: 4px; box-sizing: border-box; background: transparent; border-radius: 3px; font-size: 12px; transition: border 0.2s; }';
		html += '.board-input:hover { border-color: #cbd5e1; }';
		html += '.board-input:focus { border: 1px solid #3b82f6; background: #fff; outline: none; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }';
		html += '.link-col { min-width: 150px; font-weight: 500; }';
		html += 'a.doc-link { color: #1d4ed8; text-decoration: none; font-weight: 600; } a.doc-link:hover { text-decoration: underline; }';
		html += '.status-select { min-width: 110px; }';
		html += '.date-input { min-width: 120px; }';
		html += 'tbody tr:hover td { background-color: #f8fafc; }';
		html += 'tbody td { background-color: #ffffff; }';
		html += '</style>';

		html += '<table id="tracker-board-table">';

		// Top header
		html += '<thead><tr>';
		html += '<th rowspan="2" style="background-color:#f1f5f9; min-width:180px;">Project</th>';
		html += '<th rowspan="2" style="background-color:#f1f5f9; min-width:180px;">Site Name</th>';

		milestones.forEach((m, idx) => {
			let c = colors[idx % colors.length];
			html += `<th colspan="5" class="ms-header" style="background-color:${c.bg}; color:${c.text};">${m}</th>`;
		});
		html += '</tr><tr>';

		// Sub header — column order: Status | Forecast | Actual | Remarks | Assign To
		// Assign To is placed last so it does NOT sit visually next to the next milestone's Status
		milestones.forEach(() => {
			['Status', 'Forecast', 'Actual', 'Remarks', 'Assign To'].forEach(col => {
				html += `<th style="background-color:#f0f4f8; font-size:11px; font-weight:600; color:#475569; text-align:center; text-transform:uppercase; letter-spacing:0.4px;">${col}</th>`;
			});
		});
		html += '</tr></thead>';

		// Body
		html += '<tbody>';
		if (data.length === 0) {
			html += `<tr><td colspan="${2 + (milestones.length * 5)}" class="text-center text-muted" style="padding:20px;">No records found.</td></tr>`;
		}

		data.forEach(row => {
			html += '<tr>';

			let p_link = `<a href="/app/site-projects/${row.project}" class="doc-link">${row.project}</a>`;
			let s_link = `<a href="/app/site/${row.site}" class="doc-link">${row.site_name || row.site || ''}</a>`;

			html += `<td class="link-col">${p_link}</td>`;
			html += `<td class="link-col">${s_link}</td>`;

			milestones.forEach((m, idx) => {
				let m_data = row.milestones[m] || {};
				let row_name = m_data.name || '';
				let site_tracker = row.site_tracker || '';

				let data_attrs = `data-tracker="${site_tracker}" data-rowname="${row_name}"`;

				const make_input = (field, val, type = 'text', extra_class = '') => {
					if (!site_tracker || !row_name) return `<span class="text-muted" style="opacity:0.3;">-</span>`;
					return `<input type="${type}" class="board-input ${extra_class}" data-field="${field}" ${data_attrs} value="${val || ''}">`;
				};
				const make_select = (field, val, options, is_obj = false, extra_class = '') => {
					if (!site_tracker || !row_name) return `<span class="text-muted" style="opacity:0.3;">-</span>`;
					let sel = `<select class="board-input ${extra_class}" data-field="${field}" ${data_attrs}>`;
					sel += `<option value=""></option>`;
					options.forEach(opt => {
						let oval = is_obj ? opt.value : opt;
						let olabel = is_obj ? opt.label : opt;
						sel += `<option value="${oval}" ${val === oval ? 'selected' : ''}>${olabel}</option>`;
					});
					sel += `</select>`;
					return sel;
				};

				// Column order: Status | Forecast | Actual | Remarks | Assign To
				let bcol = get_status_color(m_data.status);
				html += `<td style="border-left:2px solid ${bcol};">${make_select('status', m_data.status, app_statuses, false, 'status-select')}</td>`;

				html += `<td>${make_input('forcast', m_data.forcast, 'date', 'date-input')}</td>`;
				html += `<td>${make_input('actual', m_data.actual, 'date', 'date-input')}</td>`;
				html += `<td>${make_input('remarks', m_data.remarks)}</td>`;

				// Assign To last — prevents visual confusion with adjacent milestones
				html += `<td>${make_select('assign_to', m_data.assign_to, app_users)}</td>`;
			});

			html += '</tr>';
		});
		html += '</tbody></table>';

		page.main.find('#board-container').html(html);

		bind_events();
	}

	function bind_events() {
		page.main.find('.board-input').on('change', function () {
			let $input = $(this);
			let tracker = $input.data('tracker');
			let rowname = $input.data('rowname');
			let field = $input.data('field');
			let val = $input.val();

			if (!tracker || !rowname) return;

			$input.css('background-color', '#fff3cd'); // Warning yellow while saving

			frappe.call({
				method: 'techner.techner.page.site_tracker_board.site_tracker_board.update_milestone_field',
				args: {
					site_tracker: tracker,
					milestone_row_name: rowname,
					field: field,
					value: val
				},
				callback: function (r) {
					if (!r.exc) {
						$input.css('background-color', '#d1fae5'); // Success green
						if (field === 'status') {
							// Dynamically update border color from doctype color map
							$input.closest('td').css('border-left', '2px solid ' + get_status_color(val));
						}
						setTimeout(() => $input.css('background-color', ''), 2000);
					} else {
						$input.css('background-color', '#fee2e2'); // Danger red
					}
				}
			});
		});
	}

	page.set_primary_action('Refresh', render_board, 'refresh');

	render_board();
}