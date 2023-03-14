// Copyright (c) 2018, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Salary Structure Assignment', {
	setup: function(frm) {
		frm.set_query("employee", function() {
			return {
				query: "erpnext.controllers.queries.employee_query",
			}
		});
		frm.set_query("salary_structure", function() {
			return {
				filters: {
					company: frm.doc.company,
					docstatus: 1,
					is_active: "Yes"
				}
			}
		});

		frm.set_query("income_tax_slab", function() {
			return {
				filters: {
					company: frm.doc.company,
					docstatus: 1,
					disabled: 0,
					currency: frm.doc.currency
				}
			};
		});

		frm.set_query("payroll_payable_account", function() {
			var company_currency = erpnext.get_currency(frm.doc.company);
			return {
				filters: {
					"company": frm.doc.company,
					"root_type": "Liability",
					"is_group": 0,
					"account_currency": ["in", [frm.doc.currency, company_currency]],
				}
			}
		});

		frm.set_query("cost_center", "payroll_cost_centers", function() {
			return {
				filters: {
					"company": frm.doc.company,
					"is_group": 0
				}
			};
		});
		
		frm.set_query("salary_component", "earnings", function() {
			return {
				filters: {
					type: "earning"
				}
			}
		});
		frm.set_query("salary_component", "deductions", function() {
			return {
				filters: {
					type: "deduction"
				}
			}
		});
	},

	refresh: function(frm) {
		if(frm.doc.__onload){
			frm.unhide_earnings_and_taxation_section = frm.doc.__onload.earning_and_deduction_entries_does_not_exists;
			frm.trigger("set_earnings_and_taxation_section_visibility");
		}
	},

	employee: function(frm) {
		if (frm.doc.employee) {
			frm.trigger("set_payroll_cost_centers");
			frm.trigger("valiadte_joining_date_and_salary_slips");
		}
		else {
			frm.set_value("payroll_cost_centers", []);
		}
	},

	company: function(frm) {
		if (frm.doc.company) {
			frappe.db.get_value("Company", frm.doc.company, "default_payroll_payable_account", (r) => {
				frm.set_value("payroll_payable_account", r.default_payroll_payable_account);
			});
		}
	},

	set_payroll_cost_centers: function(frm) {
		if (frm.doc.payroll_cost_centers && frm.doc.payroll_cost_centers.length < 1) {
			frappe.call({
				method: "set_payroll_cost_centers",
				doc: frm.doc,
				callback: function(data) {
					refresh_field("payroll_cost_centers");
				}
			})
		}
	},

	valiadte_joining_date_and_salary_slips: function(frm) {
		frappe.call({
			method: "earning_and_deduction_entries_does_not_exists",
			doc: frm.doc,
			callback: function(data) {
				let earning_and_deduction_entries_does_not_exists = data.message;
				frm.unhide_earnings_and_taxation_section = earning_and_deduction_entries_does_not_exists;
				frm.trigger("set_earnings_and_taxation_section_visibility");
			}
		});
	},

	set_earnings_and_taxation_section_visibility: function(frm) {
		if(frm.unhide_earnings_and_taxation_section){
			frm.set_df_property('earnings_and_taxation_section', 'hidden', 0);
		}
		else{
			frm.set_df_property('earnings_and_taxation_section', 'hidden', 1);
		}
	},

	from_date: function(frm) {
		if (frm.doc.from_date) {
			frm.trigger("valiadte_joining_date_and_salary_slips" );
		}
	},
});

frappe.ui.form.on('Salary Detail', {
	salary_component: function(frm, cdt, cdn) {
		var child = locals[cdt][cdn];
		if(child.salary_component){
			frappe.call({
				method: "frappe.client.get",
				args: {
					doctype: "Salary Component",
					name: child.salary_component
				},
				callback: function(data) {
					if(data.message){
						var result = data.message;
						frappe.model.set_value(cdt, cdn, 'condition', result.condition);
						frappe.model.set_value(cdt, cdn, 'amount_based_on_formula', result.amount_based_on_formula);
						if(result.amount_based_on_formula == 1){
							frappe.model.set_value(cdt, cdn, 'formula', result.formula);
						}
						else{
							frappe.model.set_value(cdt, cdn, 'amount', result.amount);
						}
						frappe.model.set_value(cdt, cdn, 'statistical_component', result.statistical_component);
						frappe.model.set_value(cdt, cdn, 'depends_on_payment_days', result.depends_on_payment_days);
						frappe.model.set_value(cdt, cdn, 'do_not_include_in_total', result.do_not_include_in_total);
						frappe.model.set_value(cdt, cdn, 'variable_based_on_taxable_salary', result.variable_based_on_taxable_salary);
						frappe.model.set_value(cdt, cdn, 'is_tax_applicable', result.is_tax_applicable);
						frappe.model.set_value(cdt, cdn, 'is_flexible_benefit', result.is_flexible_benefit);
						refresh_field("earnings");
						refresh_field("deductions");
					}
				}
			});
		}
	},

	amount_based_on_formula: function(frm, cdt, cdn) {
		var child = locals[cdt][cdn];
		if(child.amount_based_on_formula == 1){
			frappe.model.set_value(cdt, cdn, 'amount', null);
		}
		else{
			frappe.model.set_value(cdt, cdn, 'formula', null);
		}
	}
})
