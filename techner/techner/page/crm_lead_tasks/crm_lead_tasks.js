frappe.pages['crm-lead-tasks'].on_page_load = function (wrapper) {
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
		this.avatar_colors = ['#2563eb', '#7c3aed', '#0891b2', '#d97706', '#059669', '#db2777', '#4f46e5', '#ea580c'];

		this.setup_page();
		this.fetch_and_render();
	}

	setup_page() {
		this.page.set_title_sub('Stay on top of your meetings, calls and follow-ups');

		this.page.set_primary_action('Add New Task', () => {
			frappe.new_doc('Lead Contact Person Tasks');
		}, 'fa fa-plus');

		this.page.add_inner_button('<i class="fa fa-calendar"></i>&nbsp; View Calendar', () => {
			frappe.set_route('List', 'Lead Contact Person Tasks', 'Calendar', 'Lead Contact Person');
		});

		this.refresh_btn = this.page.add_inner_button('<i class="fa fa-refresh"></i>&nbsp; Refresh', () => {
			this.fetch_and_render();
		});
		this.refresh_btn.attr('title', 'Reload latest task data');

		let filter_html = `
			<div class="crm-date-filter">
				<i class="fa fa-calendar-o"></i>
				<input type="date" class="crm-date-input" value="${this.selected_date}">
				<button class="crm-today-btn" title="Jump to today"><i class="fa fa-bullseye"></i> Today</button>
			</div>
		`;
		let filter_el = $(filter_html).insertBefore(this.refresh_btn);

		filter_el.find('.crm-date-input').on('change', (e) => {
			this.selected_date = $(e.currentTarget).val();
			this.fetch_and_render();
		});
		filter_el.find('.crm-today-btn').on('click', () => {
			this.selected_date = frappe.datetime.get_today();
			filter_el.find('.crm-date-input').val(this.selected_date);
			this.fetch_and_render();
		});

		this.container = $(`<div class="crm-tasks-wrapper"></div>`).appendTo(this.page.main);
	}

	fetch_and_render() {
		if (this.refresh_btn) {
			this.refresh_btn.prop('disabled', true).find('i').addClass('fa-spin');
		}
		this.show_loading_state();

		frappe.call({
			method: 'techner.techner.page.crm_lead_tasks.crm_lead_tasks.get_lead_tasks',
			args: {
				selected_date: this.selected_date
			},
			callback: (r) => {
				if (r.message) {
					this.render(r.message);
				}
			},
			always: () => {
				if (this.refresh_btn) {
					this.refresh_btn.prop('disabled', false).find('i').removeClass('fa-spin');
				}
			}
		});
	}

	show_loading_state() {
		this.container.html(`
			<div class="crm-loading-state">
				<i class="fa fa-spinner fa-spin"></i>
				<span>Loading tasks…</span>
			</div>
		`);
	}

	render(data) {
		let is_today = this.selected_date === frappe.datetime.get_today();
		let today_label = is_today ? "Today's Tasks" : `Tasks for ${frappe.datetime.str_to_user(this.selected_date)}`;
		let has_any = (data.today_tasks && data.today_tasks.length) ||
			(data.next_7_days_tasks && data.next_7_days_tasks.length) ||
			(data.overdue_tasks && data.overdue_tasks.length);

		let now_str = moment().format('hh:mm A');

		let html = `
			<div class="crm-toolbar-row">
				<div class="crm-toolbar-info">
					<span class="crm-live-dot"></span>
					Last updated at <strong>${now_str}</strong>
				</div>
				<div class="crm-search-box">
					<i class="fa fa-search"></i>
					<input type="text" class="crm-search-input" placeholder="Search by contact, company or task title...">
				</div>
			</div>

			<div class="crm-summary-cards">
				${this.get_summary_card(today_label.replace('Tasks for', 'Tasks —'), data.summary.today, is_today ? 'Tasks due today' : 'Tasks due on selected date', 'green-card', 'calendar-check-o', data.summary.total, true, 'today')}
				${this.get_summary_card('Total Open Tasks', data.summary.total, 'All open tasks in the pipeline', 'blue-card', 'list-ul', data.summary.total, false, 'total')}
				${this.get_summary_card('Next 7 Days', data.summary.next_7_days, 'Upcoming tasks this week', 'yellow-card', 'calendar-plus-o', data.summary.total, true, 'next7')}
				${this.get_summary_card('Overdue Tasks', data.summary.overdue, 'Past due date — needs attention', 'red-card', 'exclamation-triangle', data.summary.total, true, 'overdue')}
			</div>

			${has_any ? `
				${this.get_task_section(today_label, data.today_tasks, 'calendar-check-o', data.summary.today, 'today')}
				${this.get_task_section('Next 7 Days Tasks', data.next_7_days_tasks, 'calendar-plus-o', data.summary.next_7_days, 'next7')}
				${this.get_task_section('Overdue Tasks', data.overdue_tasks, 'exclamation-triangle', data.summary.overdue, 'overdue')}
			` : this.get_empty_state()}
		`;

		this.container.html(html);
		this.setup_events();
	}

	get_empty_state() {
		return `
			<div class="crm-empty-state">
				<i class="fa fa-check-circle"></i>
				<h4>All caught up!</h4>
				<p>There are no open tasks for the selected date range.</p>
			</div>
		`;
	}

	get_summary_card(title, value, desc, color_class, icon, total, show_progress = false, filter_type = '') {
		let progress_html = '';
		if (show_progress) {
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
			<div class="crm-card ${color_class}" data-filter-type="${filter_type}">
				<div class="crm-card-icon">
					<i class="fa fa-${icon}"></i>
				</div>
				<div class="crm-card-content">
					<div class="crm-card-title">${this.escape_html(title)}</div>
					<div class="crm-card-value">${value}</div>
					<div class="crm-card-desc">${this.escape_html(desc)}</div>
				</div>
				${progress_html}
				<i class="fa fa-chevron-right crm-card-arrow"></i>
			</div>
		`;
	}

	get_task_section(title, tasks, icon, count, section_type) {
		if (!tasks || tasks.length === 0) {
			return '';
		}

		// Group by Sales Owner (link_lvha)
		let grouped = {};
		tasks.forEach(t => {
			let group_by_val = t.link_lvha || 'Unassigned';
			if (!grouped[group_by_val]) {
				grouped[group_by_val] = {
					name: group_by_val,
					tasks: []
				};
			}
			grouped[group_by_val].tasks.push(t);
		});

		let show_date_col = section_type !== 'today';
		let rows_html = '';

		Object.values(grouped).forEach(g => {
			let initials = g.name.substring(0, 2).toUpperCase();
			let avatar_color = this.get_avatar_color(g.name);
			rows_html += `
				<tr class="crm-group-header" data-contact="${this.escape_html(g.name)}">
					<td colspan="8">
						<i class="fa fa-chevron-down crm-group-chevron"></i>
						<span class="crm-avatar" style="background:${avatar_color}">${this.escape_html(initials)}</span>
						<span class="crm-group-name">${this.escape_html(g.name)}</span>
						<span class="crm-group-count">${g.tasks.length}</span>
					</td>
				</tr>
			`;

			g.tasks.forEach(t => {
				let time_str = t.time ? t.time.substring(0, 5) : '';
				let date_str = frappe.datetime.str_to_user(t.date);
				let ampm = '';
				if (time_str) {
					let hrs = parseInt(time_str.split(':')[0]);
					ampm = hrs >= 12 ? 'PM' : 'AM';
					hrs = hrs % 12;
					hrs = hrs ? hrs : 12;
					time_str = (hrs < 10 ? '0' + hrs : hrs) + ':' + time_str.split(':')[1] + ' ' + ampm;
				}

				let badge_class_type = 'badge-' + (t.type || '').toLowerCase();
				let badge_class_priority = 'badge-' + (t.priority || '').toLowerCase();
				let badge_class_status = 'badge-' + (t.task_status || '').toLowerCase().replace(/\s+/g, '');

				let date_chip = '';
				if (show_date_col) {
					let chip_class = section_type === 'overdue' ? 'is-overdue' : 'is-upcoming';
					date_chip = `<div class="crm-date-chip ${chip_class}">${moment(t.date).format('DD MMM')}</div>`;
				}

				rows_html += `
					<tr class="crm-task-row" data-name="${t.name}">
						<td class="col-time">
							${date_chip}
							<strong class="crm-time-text">${time_str || '—'}</strong>
						</td>
						<td>
							<div class="crm-contact-info">
								<div class="crm-contact-details">
									<span class="crm-contact-name">${this.escape_html(t.lead_contact_person)}</span>
									<span class="crm-contact-meta">${this.escape_html(t.crm_lead_company || '')}</span>
									<span class="crm-contact-meta">${this.escape_html(t.designation || '')}</span>
								</div>
							</div>
						</td>
						<td><span class="crm-title-text" title="${this.escape_html(t.title)}">${this.escape_html(t.title)}</span></td>
						<td><span class="crm-badge ${badge_class_type}"><i class="fa ${this.get_type_icon(t.type)}"></i>${this.escape_html(t.type || '-')}</span></td>
						<td><span class="crm-badge ${badge_class_priority}"><i class="fa ${this.get_priority_icon(t.priority)}"></i>${this.escape_html(t.priority || '-')}</span></td>
						<td><span class="crm-badge ${badge_class_status}"><i class="fa ${this.get_status_icon(t.task_status)}"></i>${this.escape_html(t.task_status || '-')}</span></td>
						<td class="crm-desc-cell">
							<span class="crm-desc-text" title="${this.escape_html(this.strip_html(t.description || ''))}">${this.escape_html(this.strip_html(t.description || '-'))}</span>
							<span class="crm-desc-date">${date_str}</span>
						</td>
						<td class="col-actions">
							<button class="crm-action-btn" data-name="${t.name}" title="Open task">
								<i class="fa fa-chevron-right"></i>
							</button>
						</td>
					</tr>
				`;
			});
		});

		let section_class = 'section-' + section_type;

		return `
			<div class="crm-section ${section_class}">
				<div class="crm-section-header">
					<div class="crm-section-title">
						<span class="crm-section-icon"><i class="fa fa-${icon}"></i></span>
						${this.escape_html(title)}
						<span class="crm-section-badge">${count}</span>
					</div>
					<a href="#" class="view-all-link" data-filter-type="${section_type}">View All <i class="fa fa-chevron-right"></i></a>
				</div>
				<div class="crm-table-scroll">
					<table class="crm-table">
						<thead>
							<tr>
								<th class="col-time">Time</th>
								<th class="col-contact">Contact Person</th>
								<th class="col-title">Task Title</th>
								<th class="col-type">Type</th>
								<th class="col-priority">Priority</th>
								<th class="col-status">Task Status</th>
								<th class="col-description">Description</th>
								<th class="col-actions"></th>
							</tr>
						</thead>
						<tbody>
							${rows_html}
						</tbody>
					</table>
				</div>
			</div>
		`;
	}

	get_avatar_color(name) {
		let hash = 0;
		for (let i = 0; i < name.length; i++) {
			hash = name.charCodeAt(i) + ((hash << 5) - hash);
		}
		return this.avatar_colors[Math.abs(hash) % this.avatar_colors.length];
	}

	get_type_icon(type) {
		let map = { call: 'fa-phone', email: 'fa-envelope', meeting: 'fa-users' };
		return map[(type || '').toLowerCase()] || 'fa-tag';
	}

	get_priority_icon(priority) {
		let map = { high: 'fa-arrow-up', medium: 'fa-minus', low: 'fa-arrow-down' };
		return map[(priority || '').toLowerCase()] || 'fa-circle';
	}

	get_status_icon(status) {
		let map = {
			'to do': 'fa-circle-o',
			'inprogress': 'fa-spinner',
			'completed': 'fa-check-circle',
			'cancelled': 'fa-times-circle',
			'scheduled': 'fa-clock-o'
		};
		return map[(status || '').toLowerCase()] || 'fa-circle-o';
	}

	escape_html(str) {
		if (str === undefined || str === null) return '';
		return $('<div>').text(str).html();
	}

	strip_html(html) {
		let tmp = document.createElement("DIV");
		tmp.innerHTML = html;
		return tmp.textContent || tmp.innerText || "";
	}

	setup_events() {
		this.container.find('.crm-action-btn').on('click', (e) => {
			e.stopPropagation();
			let name = $(e.currentTarget).data('name');
			frappe.set_route('Form', 'Lead Contact Person Tasks', name);
		});

		this.container.find('.crm-card, .view-all-link').on('click', (e) => {
			e.preventDefault();
			let filter_type = $(e.currentTarget).data('filter-type');
			if (!filter_type) return;

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
			if (icon.hasClass('fa-chevron-down')) {
				icon.removeClass('fa-chevron-down').addClass('fa-chevron-right');
				row.nextUntil('.crm-group-header').hide();
			} else {
				icon.removeClass('fa-chevron-right').addClass('fa-chevron-down');
				row.nextUntil('.crm-group-header').show();
			}
		});

		this.container.find('.crm-search-input').on('keyup', (e) => {
			let val = $(e.currentTarget).val().toLowerCase().trim();

			this.container.find('.crm-section').each((i, section) => {
				let $section = $(section);
				let visible_count = 0;

				$section.find('.crm-task-row').each((j, row) => {
					let $row = $(row);
					let match = !val || $row.text().toLowerCase().indexOf(val) > -1;
					$row.toggle(match);
					if (match) visible_count++;
				});

				$section.find('.crm-group-header').each((k, gh) => {
					let $gh = $(gh);
					let has_visible = $gh.nextUntil('.crm-group-header').filter('.crm-task-row:visible').length > 0;
					$gh.toggle(has_visible);
				});

				$section.toggleClass('crm-section-hidden', val && visible_count === 0);
			});
		});
	}
}
