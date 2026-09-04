frappe.pages['crm-lead-tasks'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'CRM Lead Tasks',
		single_column: true
	});
	
	wrapper.crm_page = new CRMLeadTasks(page, wrapper);
}

class CRMLeadTasks {
	constructor(page, wrapper) {
		this.page = page;
		this.wrapper = wrapper;
		this.selected_date = frappe.datetime.get_today();
		
		this.setup_page();
		this.fetch_and_render();
	}
	
	setup_page() {
		this.page.set_title_sub('Stay on top of your meetings, calls and follow-ups');
		
		// Action buttons
		let btn = this.page.add_inner_button('View Calendar', () => {
			frappe.set_route('List', 'Lead Contact Person Tasks', 'Calendar', 'Lead Contact Person');
		});

		// Add custom date filter next to the button
		let date_html = `
			<div style="display: inline-block; margin-right: 10px;">
				<input type="date" class="form-control input-sm" style="height: 28px; width: 140px; padding: 2px 8px; font-size: 12px;" value="${this.selected_date}">
			</div>
		`;
		let date_el = $(date_html).insertBefore(btn);
		date_el.find('input').on('change', (e) => {
			this.selected_date = $(e.currentTarget).val();
			this.fetch_and_render();
		});

		// Action button added above

		// Main container
		this.container = $(`<div class="crm-tasks-wrapper"></div>`).appendTo(this.page.main);
	}
	
	fetch_and_render() {
		frappe.call({
			method: 'techner.techner.page.crm_lead_tasks.crm_lead_tasks.get_lead_tasks',
			args: {
				selected_date: this.selected_date
			},
			callback: (r) => {
				if(r.message) {
					this.render(r.message);
				}
			}
		});
	}
	
	render(data) {
		let html = `
			<div class="crm-summary-cards">
				${this.get_summary_card('Total Tasks', data.summary.total, 'All open tasks', 'blue-card', 'list', data.summary.total, false, 'total')}
				${this.get_summary_card('Today\'s Tasks', data.summary.today, 'Tasks due today', 'green-card', 'calendar-check', data.summary.total, true, 'today')}
				${this.get_summary_card('Next 7 Days Tasks', data.summary.next_7_days, 'Tasks due in next 7 days', 'yellow-card', 'calendar-plus', data.summary.total, true, 'next7')}
				${this.get_summary_card('Overdue Tasks', data.summary.overdue, 'Tasks past due date', 'red-card', 'clock', data.summary.total, true, 'overdue')}
			</div>
			
			${this.get_task_section("Today's Tasks", data.today_tasks, 'calendar-check', data.summary.today)}
			${this.get_task_section("Next 7 Days Tasks", data.next_7_days_tasks, 'calendar-plus', data.summary.next_7_days)}
			${this.get_task_section("Overdue Tasks", data.overdue_tasks, 'clock-o', data.summary.overdue)}
		`;
		
		this.container.html(html);
		this.setup_events();
	}
	
	get_summary_card(title, value, desc, color_class, icon, total, show_progress=false, filter_type='') {
		let progress_html = '';
		if(show_progress) {
			let percent = total ? Math.round((value / total) * 100) : 0;
			progress_html = `
				<div class="crm-card-progress">
					<div class="crm-card-percent">${percent}%</div>
					<div class="crm-progress-bar">
						<div class="crm-progress-fill" style="width: ${percent}%"></div>
					</div>
				</div>
			`;
		}
		
		return `
			<div class="crm-card ${color_class}" style="cursor: pointer;" data-filter-type="${filter_type}">
				<div class="crm-card-icon">
					<i class="fa fa-${icon}"></i>
				</div>
				<div class="crm-card-content">
					<div class="crm-card-title">${title}</div>
					<div class="crm-card-value">${value}</div>
					<div class="crm-card-desc">${desc}</div>
				</div>
				${progress_html}
			</div>
		`;
	}
	
	get_task_section(title, tasks, icon, count) {
		if(!tasks || tasks.length === 0) {
			return '';
		}
		
		// Group by Sales Owner (link_lvha)
		let grouped = {};
		tasks.forEach(t => {
			let group_by_val = t.link_lvha || 'Unassigned';
			if(!grouped[group_by_val]) {
				grouped[group_by_val] = {
					name: group_by_val,
					tasks: []
				};
			}
			grouped[group_by_val].tasks.push(t);
		});
		
		let rows_html = '';
		Object.values(grouped).forEach(g => {
			let contact_name = g.name.substring(0, 2).toUpperCase(); // initials placeholder
			rows_html += `
				<tr class="crm-group-header" data-contact="${g.name}">
					<td colspan="7">
						<i class="fa fa-chevron-down" style="margin-right: 8px; font-size: 10px;"></i>
						<span style="background: #3b82f6; color: #fff; padding: 4px 8px; border-radius: 50%; font-size: 10px; margin-right: 8px;">${contact_name}</span>
						${g.name} (${g.tasks.length})
					</td>
				</tr>
			`;
			
			g.tasks.forEach(t => {
				let time_str = t.time ? t.time.substring(0,5) : '';
				let date_str = frappe.datetime.str_to_user(t.date);
				let ampm = '';
				if(time_str) {
					let hrs = parseInt(time_str.split(':')[0]);
					ampm = hrs >= 12 ? 'PM' : 'AM';
					hrs = hrs % 12;
					hrs = hrs ? hrs : 12;
					time_str = (hrs < 10 ? '0'+hrs : hrs) + ':' + time_str.split(':')[1] + ' ' + ampm;
				}
				
				let badge_class_type = 'badge-' + (t.type || '').toLowerCase();
				let badge_class_priority = 'badge-' + (t.priority || '').toLowerCase();
				let badge_class_status = 'badge-' + (t.task_status || '').toLowerCase().replace(' ', '');
				
				rows_html += `
					<tr class="crm-task-row" data-name="${t.name}">
						<td style="width: 85px; font-size: 11px; white-space: nowrap;">
							<strong>${time_str}</strong>
						</td>
						<td>
							<div class="crm-contact-info">
								<div class="crm-contact-details" style="line-height: 1.2;">
									<span class="crm-contact-name" style="font-size: 11px;">${t.lead_contact_person}</span>
									<span class="crm-contact-meta" style="font-size: 10px; color: #888;">${t.crm_lead_company || ''}</span>
									<span class="crm-contact-meta" style="font-size: 10px; color: #888;">${t.designation || ''}</span>
								</div>
							</div>
						</td>
						<td><span class="crm-title-text" title="${t.title}"><strong>${t.title}</strong></span></td>
						<td><span class="crm-badge ${badge_class_type}">${t.type || '-'}</span></td>
						<td><span class="crm-badge ${badge_class_priority}">${t.priority || '-'}</span></td>
						<td><span class="crm-badge ${badge_class_status}">${t.task_status || '-'}</span></td>
						<td class="crm-desc-cell">
							<span class="crm-desc-text" title="${this.strip_html(t.description || '')}">${this.strip_html(t.description || '-')}</span>
							<span class="crm-desc-date">${date_str}</span>
						</td>
						<td style="text-align: right; width: 40px;">
							<button class="crm-action-btn" data-name="${t.name}">
								<i class="fa fa-chevron-right" style="font-size: 10px;"></i>
							</button>
						</td>
					</tr>
				`;
			});
		});
		
		return `
			<div class="crm-section">
				<div class="crm-section-header">
					<div class="crm-section-title">
						<i class="fa fa-${icon}"></i> ${title} <span class="crm-section-badge">${count}</span>
					</div>
					<a href="#" class="view-all-link">View All <i class="fa fa-chevron-right" style="font-size: 10px; margin-left:4px;"></i></a>
				</div>
				<table class="crm-table">
					<thead>
						<tr>
							<th class="col-time">Time</th>
							<th class="col-contact">Contact Person / Designation / Company</th>
							<th class="col-title">Task Title</th>
							<th class="col-type">Type</th>
							<th class="col-priority">Priority</th>
							<th class="col-status">Task Status</th>
							<th class="col-description">Description</th>
							<th class="col-actions">Actions</th>
						</tr>
					</thead>
					<tbody>
						${rows_html}
					</tbody>
				</table>
			</div>
		`;
	}
	
	strip_html(html) {
		let tmp = document.createElement("DIV");
		tmp.innerHTML = html;
		return tmp.textContent || tmp.innerText || "";
	}
	
	setup_events() {
		this.container.find('.crm-action-btn').on('click', (e) => {
			let name = $(e.currentTarget).data('name');
			frappe.set_route('Form', 'Lead Contact Person Tasks', name);
		});
		
		this.container.find('.crm-card').on('click', (e) => {
			let filter_type = $(e.currentTarget).data('filter-type');
			if(!filter_type) return;
			
			frappe.route_options = {
				"task_status": ["not in", ["Completed", "Cancelled"]]
			};
			
			if (filter_type === 'today') {
				frappe.route_options["date"] = this.selected_date;
			} else if (filter_type === 'next7') {
				let next_7 = frappe.datetime.add_days(this.selected_date, 7);
				let start_7 = frappe.datetime.add_days(this.selected_date, 1);
				if (start_7 < frappe.datetime.get_today()) {
					start_7 = frappe.datetime.get_today();
				}
				frappe.route_options["date"] = ["between", [start_7, next_7]];
			} else if (filter_type === 'overdue') {
				frappe.route_options["date"] = ["<", frappe.datetime.get_today()];
			}
			
			frappe.set_route('List', 'Lead Contact Person Tasks');
		});
		
		this.container.find('.crm-group-header').on('click', (e) => {
			let row = $(e.currentTarget);
			let icon = row.find('i.fa-chevron-down, i.fa-chevron-right');
			if(icon.hasClass('fa-chevron-down')) {
				icon.removeClass('fa-chevron-down').addClass('fa-chevron-right');
				row.nextUntil('.crm-group-header').hide();
			} else {
				icon.removeClass('fa-chevron-right').addClass('fa-chevron-down');
				row.nextUntil('.crm-group-header').show();
			}
		});
	}
}
