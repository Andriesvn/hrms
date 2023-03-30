// Copyright (c) 2021, AvN Technologies and contributors
// For license information, please see license.txt

frappe.ui.form.on('Timesheet Period', {
	refresh: function(frm) {
		if (frm.doc.docstatus == 1) {
			frm.page.clear_primary_action();
				frm.add_custom_button(__("Generate Timesheets"),
					function() {
						frm.events.generate_timesheets(frm);
					}
				).toggleClass('btn-primary');
		}
	},
	onload: function(frm) {
		frappe.breadcrumbs.add({
			module: 'HR',
			doctype: 'Timesheet Period'
		});
	},
	generate_timesheets: function (frm) {
		return frappe.call({
			doc: frm.doc,
			method: 'create_monthly_timesheets',
			callback: function(r) {
				frm.reload_doc();
			},
			freeze: true,
			freeze_message: __("Creating Monthly Timesheets...")
		})
	},
});
