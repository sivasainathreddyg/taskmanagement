sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, MessageToast, MessageBox, JSONModel, Filter, FilterOperator) {
    "use strict";
    var that = this;

    return Controller.extend("com.taskmanagement.taskmanagement.controller.Projects", {

        onInit: function () {
            this.router = this.getOwnerComponent().getRouter();
            // that.Email = sap.ushell.Container.getService("UserInfo").getEmail();
            that.Email = "saipavanbassa@sbpcorp.com"
        },

        onAfterRendering: function () {
            this.readdata();
            this.getemployeename(that.Email);
            this.loadDevelopers();
        },
        loadDevelopers: function () {
            var oModel = this.getView().getModel(); // Main ODataModel
            var oView = this.getView();

            // Filter for developers only
            var oFilter = new sap.ui.model.Filter("role", sap.ui.model.FilterOperator.EQ, "D");

            oModel.read("/Employee", {
                filters: [oFilter],
                success: function (oData) {
                    var oDevModel = new sap.ui.model.json.JSONModel(oData.results);
                    oView.setModel(oDevModel, "DeveloperModel");
                },
                error: function () {
                    sap.m.MessageBox.error("Failed to load Developer data");
                }
            });
        },
        onFilterChange: function () {
            var oTable = this.byId("projectManagementTable");
            var oBinding = oTable.getBinding("items");
            var aFilters = [];

            var sStatus = this.byId("IdprStatus").getSelectedKey();
            var sDeveloper = this.byId("idprdeveloper").getSelectedKey();
            var oDateFrom = this.byId("idprDateRange").getDateValue();
            var oDateTo = this.byId("idprDateRange").getSecondDateValue();

            if (sStatus) {
                aFilters.push(new sap.ui.model.Filter("status", sap.ui.model.FilterOperator.EQ, sStatus));
            }

            if (sDeveloper) {
                aFilters.push(new sap.ui.model.Filter("assignedTo", sap.ui.model.FilterOperator.EQ, sDeveloper));
            }

            if (oDateFrom && oDateTo) {

                var dDateStart = new Date(oDateFrom);
                var dDateEnd = new Date(oDateTo);

                dDateStart.setHours(0, 0, 0, 0);
                dDateEnd.setHours(23, 59, 59, 999);


                aFilters.push(new sap.ui.model.Filter({
                    path: "plannedStartDate",
                    operator: sap.ui.model.FilterOperator.BT,
                    value1: dDateStart,
                    value2: dDateEnd
                }));
            }


            var oFinalFilter = new sap.ui.model.Filter({
                filters: aFilters,
                and: true
            });

            oBinding.filter(oFinalFilter);
        },
        getemployeename: function (sEmail) {
            var oModel = this.getView().getModel();
            var oFilter = new sap.ui.model.Filter("email", sap.ui.model.FilterOperator.EQ, sEmail);
            oModel.read("/Employee", {
                filters: [oFilter],
                success: function (odata) {
                    if (odata.results.length > 0) {
                        that.empname = odata.results[0].name;
                    }
                }.bind(this),
                error: function (err) {
                    MessageBox.error("Failed to read Employee data");
                }
            })
        },

        onrefreshPress: function () {
            this.readdata();
        },

        readdata: function () {
            var oModel = this.getView().getModel();
            oModel.read("/ProjectManagement", {
                success: function (oData) {

                    oData.results.forEach(function (item) {
                        if (item.assignedTo) {
                            item.assignedTo = item.assignedTo.split(",");
                        } else {
                            item.assignedTo = [];
                        }
                    });
                    var oJsonModel = new JSONModel(oData.results);
                    this.getView().setModel(oJsonModel, "TaskDataModel");
                }.bind(this),
                error: function () {
                    MessageBox.error("Failed to read Project Management data");
                }
            });
        },

        onAddPress: function () {
            this.openDialog({}, "Add");
        },

        onEditPress: function () {
            var oTable = this.byId("projectManagementTable");
            var oSelected = oTable.getSelectedItem();
            if (!oSelected) {
                MessageToast.show("Select a record to edit");
                return;
            }
            var oData = oSelected.getBindingContext("TaskDataModel").getObject();
            this.openDialog(oData, "Edit");
        },

        // openDialog: function (oData, sMode) {
        //     var oModel = new JSONModel(oData || {});
        //     this.getView().setModel(oModel, "ProjectModel");

        //     if (!this.pDialog) {
        //         this.pDialog = sap.ui.xmlfragment(
        //             "com.taskmanagement.taskmanagement.Fragment.ProjectManagementDialog",
        //             this
        //         );
        //         this.getView().addDependent(this.pDialog);
        //     }

        //     var oBtn = this.pDialog.getBeginButton();
        //       if (sMode === "Add") {
        //         oBtn.setText("Save");
        //         oModel.setData({ isEditable: true });
        //     } else if (sMode === "Edit") {
        //         oBtn.setText("Update");
        //         oModel.setData({ ...oData, isEditable: false });
        //     }

        //     this.pDialog.open();
        // },

        openDialog: function (oData, sMode) {
            var oModel = new JSONModel(oData || {});
            this.getView().setModel(oModel, "ProjectModel");

            if (!this.pDialog) {
                this.pDialog = sap.ui.xmlfragment(
                    "com.taskmanagement.taskmanagement.Fragment.ProjectManagementDialog",
                    this
                );
                this.getView().addDependent(this.pDialog);
            }
            this.resetValueStates();
            var oBtn = this.pDialog.getBeginButton();

            if (sMode === "Add") {
                oBtn.setText("Save");
                oModel.setData({ isEditable: true });
            } else if (sMode === "Edit") {
                oBtn.setText("Update");
                oModel.setData({ ...oData, isEditable: false });
            }

            this.pDialog.open();
        },



        onCreateupdatePress: function (oEvent) {
            var sText = oEvent.getSource().getText();
            if (sText === "Save") {
                this.onCreatePress();
            } else {
                this.onUpdatePress();
            }
        },

        onCreatePress: function () {

            var oEntry = this.getView().getModel("ProjectModel").getData();
            oEntry.createdUser = that.empname;
            var oModel = this.getView().getModel();


            var aRequiredFields = [
                { id: "numberInput", value: oEntry.KYnumber, name: "Number" },
                { id: "projectNameInput", value: oEntry.projectName, name: "projectName" },
                // { id: "IcrType", value: oEntry.type, name: "Type" },
                { id: "PdescriptionInput", value: oEntry.description, name: "description" },
                { id: "PstatusInput", value: oEntry.status, name: "status" },
                { id: "PassignedToInput", value: oEntry.assignedTo, name: "Assigned To" },
                { id: "teamSizeInput", value: oEntry.teamSize, name: "teamSize" }
            ];

            var bValid = true;
            aRequiredFields.forEach(function (field) {
                var oControl = sap.ui.getCore().byId(field.id);
                if (!field.value || field.value.toString().trim() === "") {
                    oControl.setValueState("Error");
                    oControl.setValueStateText(field.name + " is required");
                    bValid = false;
                } else {
                    oControl.setValueState("None");
                }
            }, this);

            var oDatePicker = sap.ui.getCore().byId("plannedStartDateInput");
            if (!oEntry.plannedStartDate) {
                oDatePicker.setValueState("Error");
                // oDatePicker.setValueStateText("Create Date is required");
                bValid = false;
            } else {
                oDatePicker.setValueState("None");
                oEntry.plannedStartDate = oEntry.plannedStartDate;
            }

            var oDatePicker = sap.ui.getCore().byId("plannedEndDateInput");
            if (!oEntry.plannedEndDate) {
                oDatePicker.setValueState("Error");
                // oDatePicker.setValueStateText("Create Date is required");
                bValid = false;
            } else {
                oDatePicker.setValueState("None");
                oEntry.plannedEndDate = oEntry.plannedEndDate;
            }



            if (!bValid) {
                MessageToast.show("Please fill all required fields");
                return;
            }

            if (oEntry.KYnumber) {
                oEntry.KYnumber = oEntry.KYnumber.toUpperCase();
            }




            var oDatePicker = sap.ui.getCore().byId("plannedStartDateInput");
            if (oDatePicker && oDatePicker.getDateValue()) {
                oEntry.plannedStartDate = oDatePicker.getDateValue();
            } else {
                oEntry.plannedStartDate = new Date();

            }
            var oEDatePicker = sap.ui.getCore().byId("plannedEndDateInput");
            if (oEDatePicker && oEDatePicker.getDateValue()) {
                oEntry.plannedEndDate = oEDatePicker.getDateValue();
            } else {
                oEntry.plannedEndDate = new Date();
            }
            if (Array.isArray(oEntry.assignedTo)) {
                oEntry.assignedTo = oEntry.assignedTo.join(",");
            }
            const { isEditable, ...payload } = oEntry;

            oModel.create("/ProjectManagement", payload, {
                success: function () {
                    MessageToast.show("Project created successfully");
                    this.pDialog.close();
                    this.readdata();
                }.bind(this),
                error: function () {
                    MessageBox.error("Creation failed");
                }
            });
        },

        onUpdatePress: function () {
            var oEntry = this.getView().getModel("ProjectModel").getData();
            var oModel = this.getView().getModel();
            var aRequiredFields = [
                { id: "numberInput", value: oEntry.KYnumber, name: "Number" },
                { id: "projectNameInput", value: oEntry.projectName, name: "projectName" },
                // { id: "IcrType", value: oEntry.type, name: "Type" },
                { id: "PdescriptionInput", value: oEntry.description, name: "description" },
                { id: "PstatusInput", value: oEntry.status, name: "status" },
                { id: "PassignedToInput", value: oEntry.assignedTo, name: "Assigned To" },
                { id: "teamSizeInput", value: oEntry.teamSize, name: "teamSize" }
            ];

            var bValid = true;
            aRequiredFields.forEach(function (field) {
                var oControl = sap.ui.getCore().byId(field.id);
                if (!field.value || field.value.toString().trim() === "") {
                    oControl.setValueState("Error");
                    oControl.setValueStateText(field.name + " is required");
                    bValid = false;
                } else {
                    oControl.setValueState("None");
                }
            }, this);

            var oDatePicker = sap.ui.getCore().byId("plannedStartDateInput");
            if (!oEntry.plannedStartDate) {
                oDatePicker.setValueState("Error");
                // oDatePicker.setValueStateText("Create Date is required");
                bValid = false;
            } else {
                oDatePicker.setValueState("None");
                oEntry.plannedStartDate = oEntry.plannedStartDate;
            }

            var oDatePicker = sap.ui.getCore().byId("plannedEndDateInput");
            if (!oEntry.plannedEndDate) {
                oDatePicker.setValueState("Error");
                // oDatePicker.setValueStateText("Create Date is required");
                bValid = false;
            } else {
                oDatePicker.setValueState("None");
                oEntry.plannedEndDate = oEntry.plannedEndDate;
            }



            if (!bValid) {
                MessageToast.show("Please fill all required fields");
                return;
            }

            if (oEntry.KYnumber) {
                oEntry.KYnumber = oEntry.KYnumber.toUpperCase();
            }


            const { isEditable, ...payload } = oEntry;
            if (Array.isArray(oEntry.assignedTo)) {
                oEntry.assignedTo = oEntry.assignedTo.join(",");
            }
            oModel.update("/ProjectManagement('" + oEntry.KYnumber + "')", payload, {
                success: function () {
                    MessageToast.show("Project updated successfully");
                    this.pDialog.close();
                    this.readdata();
                }.bind(this),
                error: function () {
                    MessageBox.error("Update failed");
                }
            });
        },

        onDeletePress: function () {
            var oTable = this.byId("projectManagementTable");
            var oSelected = oTable.getSelectedItem();

            if (!oSelected) {
                MessageToast.show("Select a record to delete");
                return;
            }

            var oData = oSelected.getBindingContext("TaskDataModel").getObject();
            var sPath = "/ProjectManagement('" + oData.KYnumber + "')";
            // var sPath = `/ProjectManagement(projectID=${oData.projectID},number=${oData.number})`;

            this.getView().getModel().remove(sPath, {
                success: function () {
                    MessageToast.show("Deleted successfully");
                    this.readdata();
                }.bind(this),
                error: function () {
                    MessageBox.error("Delete failed");
                }
            });
        },

        onCancelPress: function () {
            this.pDialog.close();
        },
        resetValueStates: function () {
            const aIds = [
                "numberInput",
                "projectNameInput",
                "PdescriptionInput",
                "plannedStartDateInput",
                "plannedEndDateInput",
                "PstatusInput",
                "PassignedToInput",
                "teamSizeInput"
            ];

            aIds.forEach(id => {
                const oControl = sap.ui.getCore().byId(id);
                if (oControl && oControl.setValueState) {
                    oControl.setValueState("None");
                }
            });
        },


        onpresshome: function () {
            this.router.navTo("RouteView1");
        }
    });
});
