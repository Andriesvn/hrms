// Copyright (c) 2016, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on("Employee", {
	setup: function (frm) {
		frm.set_query("company", function() {
			return {
				"filters": {
					"is_group": 0
				}
			};
		});
		frm.set_query("leave_policy", function() {
			return {
				filters: {
					"docstatus": 1
				}
			};
		});

		frm.set_query("payroll_cost_center", function() {
			return {
				filters: {
					"company": frm.doc.company,
					"is_group": 0
				}
			};
		});
		frm.set_query("branch", function() {
			return {
				filters: {
					"company": frm.doc.company
				}
			};
		});
		frm.set_query("department", function() {
			return {
				"filters": {
					"company": frm.doc.company,
					"is_group": 0
				}
			};
		});
	},
	onload: function (frm) {
		frm.set_query("department", function() {
			return {
				"filters": {
					"company": frm.doc.company,
					"is_group": 0
				}
			};
		});
		frm.set_query("company", function() {
			return {
				"filters": {
					"is_group": 0
				}
			};
		});
	},
	refresh: function (frm, cdt, cdn) {
		frm.clear_custom_buttons();
		if (frm.doc.docstatus == 0) {
			if(!frm.is_new()) {
				if (frm.doc.timesheet_required == 1){
					frm.add_custom_button(__("Download Clockings"), function() {
						frm.events.download_clockings(frm, cdt, cdn);
					}, __("Utilities"));
				}
				frm.add_custom_button(__("Generate Auto Shift"), function() {
					frm.events.generate_shift(frm, cdt, cdn);
						//frappe.set_route("Form", "Item Variant Settings");
				}, __("Utilities"));

				//frm.add_custom_button(__("Something else"), function() {
					//frappe.set_route("query-report", "Item Variant Details", {"item": frm.doc.name});
				//}, __("Utilities"));
			}
		}
	},
	date_of_birth(frm) {
		frm.call({
			method: "hrms.overrides.employee_master.get_retirement_date",
			args: {
				date_of_birth: frm.doc.date_of_birth
			}
		}).then((r) => {
			if (r && r.message)
				frm.set_value("date_of_retirement", r.message);
		});
	},
	download_clockings: function(frm, cdt, cdn) {
		var detail = locals[cdt][cdn];
		var dialog = new frappe.ui.Dialog({
			title: __('Download Clockings for ' + detail.first_name + ' ' + detail.last_name),
			fields: [
				{
					label: __('Date From'),
					fieldname: 'date_from',
					fieldtype: 'Date',
					//default: detail.date,
					reqd: 1,
				},
				{fieldtype: 'Column Break',},
				{
					label: __('Date To'),
					fieldname: 'date_to',
					fieldtype: 'Date',
					//default: detail.date,
					reqd: 1,
				},
			],
			primary_action_label: __('Submit'),
			primary_action(values) {
				frappe.call({
					method: "hrms.overrides.employee_master.download_employee_clockings",
					args: {
						employee: detail.name,
						date_from: values.date_from,
						date_to: values.date_to,
					},
					// disable the button until the request is completed
    				btn: $('.btn-modal-primary'),
					callback: function(r) {
						dialog.hide();
						//frm.reload_doc();
					},
					freeze: true,
					freeze_message: __("Downloading Clockings")
				})
			}
		});
		//dialog.set_value("date_to", detail.date);
		dialog.show();
	},
	generate_shift: function(frm, cdt, cdn) {
		var detail = locals[cdt][cdn];
		var dialog = new frappe.ui.Dialog({
			title: __('Generate Auto Shift for ' + detail.first_name + ' ' + detail.last_name),
			fields: [
				{
					label: __('Date From'),
					fieldname: 'date_from',
					fieldtype: 'Date',
					reqd: 1,
				},
				{
					label: __('Shift Pattern'),
					fieldname: 'shift_pattern',
					fieldtype: 'Link',
					options:"Shift Pattern",
					reqd: 1,
				},
				{fieldtype: 'Column Break',},
				{
					label: __('Date To'),
					fieldname: 'date_to',
					fieldtype: 'Date',
					reqd: 1,
				},
			],
			primary_action_label: __('Submit'),
			primary_action(values) {
				console.log("Form Details:" , detail);
				frappe.call({
					method: "hrms.overrides.employee_master.generate_shifts_for_employee",
					args: {
						employee: detail.name,
						date_from: values.date_from,
						date_to: values.date_to,
						shift_pattern: values.shift_pattern,
					},
					// disable the button until the request is completed
    				btn: $('.btn-modal-primary'),
					callback: function(r) {
						dialog.hide();
						//frm.reload_doc();
					},
					freeze: true,
					freeze_message: __("Generating Auto Shift")
				})
			}
		});
		//dialog.set_value("date_to", detail.date);
		dialog.show();
	},

})