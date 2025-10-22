sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment"
], function (Controller, MessageToast, MessageBox, JSONModel, Fragment) {
    "use strict";
    var that = this;

    return Controller.extend("com.taskmanagement.taskmanagement.controller.ChangeRequest", {

        onInit: function () {
            that.component = this.getOwnerComponent().getRouter().initialize();
            that.Email = sap.ushell.Container.getService("UserInfo").getEmail();
            // that.Email = "saipavanbassa@sbpcorp.com"
            var oTable = this.byId("changeRequestTable");
            oTable.setModel(this.getView().getModel());
        },
        onAfterRendering: function () {
            this.readdata();
            this.getemployeename(that.Email);
            this.loadDevelopers();
            this.loadAnalysts();
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
        onFilterChange: function () {
            var oTable = this.byId("changeRequestTable");
            var oBinding = oTable.getBinding("items");
            var aFilters = [];

            var sStatus = this.byId("IdcrqStatus").getSelectedKey();
            var sDeveloper = this.byId("idcrqdeveloper").getSelectedKey();
            var oDateFrom = this.byId("idcrqDateRange").getDateValue();
            var oDateTo = this.byId("idcrqDateRange").getSecondDateValue();

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
                    path: "createDate",
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
        }, loadDevelopers: function () {
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
        loadAnalysts: function () {
            var oModel = this.getView().getModel(); // Main ODataModel
            var oView = this.getView();

            // Filter for developers only
            var oFilter = new sap.ui.model.Filter("role", sap.ui.model.FilterOperator.EQ, "A");

            oModel.read("/Employee", {
                filters: [oFilter],
                success: function (oData) {
                    var oAntModel = new sap.ui.model.json.JSONModel(oData.results);
                    oView.setModel(oAntModel, "AnalystModel");
                },
                error: function () {
                    sap.m.MessageBox.error("Failed to load Developer data");
                }
            });
        },
        generateEmployeeId: function () {
            var oDate = new Date();

            // Format as YYYYMMDDHHMMSS
            var sId =
                ("0" + (oDate.getMonth() + 1)).slice(-2) +
                ("0" + oDate.getDate()).slice(-2) +
                ("0" + oDate.getHours()).slice(-2) +
                ("0" + oDate.getMinutes()).slice(-2) +
                ("0" + oDate.getSeconds()).slice(-2);

            return parseInt(sId); // numeric ID, optional to keep as string
        },
        onAddNewEmployee: function (sRole) {
            var that = this;

            // store role for reuse in "Add" button press
            this.newEmployeeRole = sRole;  // 'A' or 'D'

            // If dialog already exists, open it
            if (this.oAddEmployeeDialog) {
                this.oAddEmployeeDialog.setTitle(
                    sRole === "D" ? "Add New Developer" : "Add New Analyst"
                );
                this.oAddEmployeeDialog.open();
                return;
            }

            // Create the dialog once
            this.oAddEmployeeDialog = new sap.m.Dialog({
                title: sRole === "D" ? "Add New Developer" : "Add New Analyst",
                type: "Message",
                content: [
                    new sap.m.Label({ text: "Enter name:", labelFor: "empInput" }),
                    new sap.m.Input("empInput", { width: "100%" })
                ],
                beginButton: new sap.m.Button({
                    text: "Add",
                    press: function () {
                        var sNewName = sap.ui.getCore().byId("empInput").getValue().trim();

                        if (!sNewName) {
                            sap.m.MessageBox.warning("Please enter a name.");
                            return;
                        }

                        var sNewId = that.generateEmployeeId();

                        var oModel = that.getView().getModel();
                        var oNewEmployee = {
                            id: sNewId,
                            name: sNewName,
                            role: that.newEmployeeRole // 'D' or 'A'
                        };

                        oModel.create("/Employee", oNewEmployee, {
                            success: function () {
                                sap.m.MessageToast.show(
                                    that.newEmployeeRole === "D"
                                        ? "Developer added successfully!"
                                        : "Analyst added successfully!"
                                );

                                if (that.newEmployeeRole === "D") {
                                    that.loadDevelopers();
                                } else {
                                    that.loadAnalysts();
                                }
                            },
                            error: function () {
                                sap.m.MessageBox.error("Failed to add employee.");
                            }
                        });

                        that.oAddEmployeeDialog.close();
                    }
                }),

                endButton: new sap.m.Button({
                    text: "Cancel",
                    press: function () {
                        that.oAddEmployeeDialog.close();
                    }
                }),

                afterClose: function () {
                    sap.ui.getCore().byId("empInput").setValue("");
                }
            });

            this.getView().addDependent(this.oAddEmployeeDialog);
            this.oAddEmployeeDialog.open();
        },
        onShowsummary: function (oEvent) {
            var oView = this.getView();
            var oButton = oEvent.getSource();

            // Lazy load fragment
            if (!this.CSummaryPopover) {
                this.CSummaryPopover = Fragment.load({
                    id: oView.getId(),
                    name: "com.taskmanagement.taskmanagement.Fragment.CRQSummaryPopover",
                    controller: this
                }).then(function (oPopover) {
                    oView.addDependent(oPopover);
                    return oPopover;
                });
            }

            // Read TaskManagement data
            var oModel = this.getView().getModel(); // OData model
            var that = this;

            oModel.read("/TaskManagement", {
                success: function (oData) {
                    // Filter only Incident tasks
                    var aIncidents = oData.results.filter(item => item.taskType === "CHG");

                    // Count tasks by employee
                    var oCounts = {};
                    aIncidents.forEach(item => {
                        var emp = item.assignedTo || "Unknown";
                        oCounts[emp] = (oCounts[emp] || 0) + 1;
                    });

                    // Convert to array
                    var aSummary = Object.keys(oCounts).map(emp => ({
                        assignedTo: emp,
                        count: oCounts[emp]
                    }));

                    // Set to local model
                    var oSummaryModel = new sap.ui.model.json.JSONModel(aSummary);
                    oView.setModel(oSummaryModel, "summaryModel");

                    // Open popover
                    that.CSummaryPopover.then(function (oPopover) {
                        oPopover.openBy(oButton);
                    });

                },
                error: function (oError) {
                    sap.m.MessageToast.show("Error fetching TaskManagement data");
                }
            });
        },

        onCloseSummary: function () {
            this.byId("crqsummaryPopover").close();
        },

        onrefreshPress: function () {
            this.readdata();
        },

        onAddPress: function () {
            this.openDialog(undefined, "Add");
        },
        readdata: function () {
            var oModel = this.getView().getModel();
            var oFilter = new sap.ui.model.Filter("taskType", sap.ui.model.FilterOperator.EQ, "CHG");

            oModel.read("/TaskManagement", {
                filters: [oFilter],
                success: function (oData) {
                    var oJsonModel = new sap.ui.model.json.JSONModel(oData.results);
                    this.getView().setModel(oJsonModel, "TaskDataModel");
                }.bind(this),
                error: function (err) {
                    MessageBox.error("Failed to read Task Management data");
                }
            });
        },

        onEditPress: function () {
            var oTable = this.byId("changeRequestTable");
            var oSelected = oTable.getSelectedItem();
            if (!oSelected) {
                MessageToast.show("Select a record to edit");
                return;
            }
            var oData = oSelected.getBindingContext("TaskDataModel").getObject();
            oData.onHoldcheck = oData.onHoldcheck === "Y";
            oData.vistexcheck = oData.vistexcheck === "Yes" ? 0 : 1;
            this.openDialog(oData, "Edit");
        },


        // openDialog: function (oData, sMode) {
        //     var oModel = new sap.ui.model.json.JSONModel(oData || {});
        //     this.getView().setModel(oModel, "ChangeRequestModel");

        //     // if (!this.oDialog) {
        //     //     this.oDialog = sap.ui.xmlfragment(
        //     //         "com.taskmanagement.taskmanagement.Fragment.ChangeRequestDialog",
        //     //         this
        //     //     );
        //     //     this.getView().addDependent(this.oDialog);
        //     // }/
        //     if (!this.crqoDialog) {
        //         Fragment.load({
        //             id: this.getView().getId(),
        //             name: "com.taskmanagement.taskmanagement.Fragment.ChangeRequestDialog",
        //             controller: this
        //         }).then(function (oDialog) {
        //             this.crqoDialog = oDialog;
        //             this.getView().addDependent(oDialog);
        //             this.crqoDialog.open();
        //         }.bind(this));
        //     } else {
        //         this.crqoDialog.open();
        //     }


        //     var oBtn = this.crqoDialog.getBeginButton();
        //     if (sMode === "Add") {
        //         oBtn.setText("Save");
        //         oModel.setData({ isEditable: true });
        //     } else if (sMode === "Edit") {
        //         oBtn.setText("Update");
        //         oModel.setData({ ...oData, isEditable: false });
        //     }

        //     this.crqoDialog.bindElement("ChangeRequestModel>/");

        //     this.crqoDialog.open();
        // },


        openDialog: function (oData, sMode) {
            var oModel = new sap.ui.model.json.JSONModel(oData || {});
            this.getView().setModel(oModel, "ChangeRequestModel");

            if (!this.crqoDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "com.taskmanagement.taskmanagement.Fragment.ChangeRequestDialog",
                    controller: this
                }).then(function (oDialog) {
                    this.crqoDialog = oDialog;
                    this.getView().addDependent(oDialog);
                    this.setupDialog(oModel, sMode);
                    this.resetValueStates();
                    this.crqoDialog.open();
                }.bind(this));
            } else {
                this.setupDialog(oModel, sMode);
                this.resetValueStates();
                this.crqoDialog.open();
            }
        },
        resetValueStates: function () {
            const aIds = [
                "crNumber",
                "crChangeRequest",
                "crType",
                "crStatus",
                "crBA",
                "crAssignedTo",
                "crDescription",
                "crCreateDate"
            ];

            aIds.forEach(id => {
                const oControl = this.byId(id);
                if (oControl && oControl.setValueState) {
                    oControl.setValueState("None");
                }
            });
        },

        setupDialog: function (oModel, sMode) {
            var oBtn = this.crqoDialog.getBeginButton();
            var oDateTimePicker = this.byId("crCreateDate");
            var oToday = new Date();
            oDateTimePicker.setMaxDate(oToday);
            if (sMode === "Add") {
                oBtn.setText("Save");
                oModel.setData({ isEditable: true });
            } else if (sMode === "Edit") {
                oBtn.setText("Update");
                oModel.setData({ ...oModel.getData(), isEditable: false });
            }
            this.crqoDialog.bindElement("ChangeRequestModel>/");
        },
        onCreateupdatePress: function (oevent) {
            var btntext = oevent.getSource().getText();
            if (btntext === "Save") {
                this.onCreatePress();
            } else {
                this.onUpdatepress();

            }
        },
        onUpdatepress: function () {
            var oEntry = this.getView().getModel("ChangeRequestModel").getData();
            var oModel = this.getView().getModel();

            var aRequiredFields = [
                { id: "crNumber", value: oEntry.number, name: "Number" },
                { id: "crChangeRequest", value: oEntry.changeRequest, name: "Change Request" },
                { id: "crType", value: oEntry.type, name: "Type" },
                { id: "crStatus", value: oEntry.status, name: "Status" },
                { id: "crBA", value: oEntry.BA, name: "BA" },
                { id: "crAssignedTo", value: oEntry.assignedTo, name: "Assigned To" },
                { id: "crDescription", value: oEntry.description, name: "Description" }
            ];

            var bValid = true;
            aRequiredFields.forEach(function (field) {
                var oControl = this.byId(field.id);
                if (!field.value || field.value.toString().trim() === "") {
                    oControl.setValueState("Error");
                    oControl.setValueStateText(field.name + " is required");
                    bValid = false;
                } else {
                    oControl.setValueState("None");
                }
            }, this)
            var oDatePicker = this.byId("crCreateDate");
            if (!oEntry.createDate) {
                oDatePicker.setValueState("Error");
                oDatePicker.setValueStateText("Create Date is required");
                bValid = false;
            } else {
                oDatePicker.setValueState("None");
                oEntry.createDate = oEntry.createDate;
            }
            if (!bValid) {
                MessageToast.show("Please fill all required fields");
                return;
            }
            if (oEntry.number) {
                oEntry.number = oEntry.number.toString().toUpperCase();
            }
            if (oEntry.changeRequest) {
                oEntry.changeRequest = oEntry.changeRequest.toString().toUpperCase();
            }

            oEntry.onHoldcheck = this.byId("crOnHold").getSelected() ? "Y" : "N";
            var oVistex = this.byId("crVistex").getSelectedButton();
            oEntry.vistexcheck = oVistex.getSelected() ? oVistex.getText() : "No";

            oEntry.updateDate = new Date();
            const { isEditable, ...payload } = oEntry;


            oModel.update("/TaskManagement('" + oEntry.number + "')", payload, {
                success: function () {
                    MessageToast.show("Change Request updated successfully");
                    this.crqoDialog.close();
                    this.readdata();
                }.bind(this),
                error: function () {
                    MessageBox.error("Update failed");
                }
            });

        },
        onCreatePress: function () {
            var oEntry = this.getView().getModel("ChangeRequestModel").getData();
            var oModel = this.getView().getModel();


            var aRequiredFields = [
                { id: "crNumber", value: oEntry.number, name: "Number" },
                { id: "crChangeRequest", value: oEntry.changeRequest, name: "Change Request" },
                { id: "crType", value: oEntry.type, name: "Type" },
                { id: "crStatus", value: oEntry.status, name: "Status" },
                { id: "crBA", value: oEntry.BA, name: "BA" },
                { id: "crAssignedTo", value: oEntry.assignedTo, name: "Assigned To" },
                { id: "crDescription", value: oEntry.description, name: "Description" }
            ];

            var bValid = true;
            aRequiredFields.forEach(function (field) {
                var oControl = this.byId(field.id);
                if (!field.value || field.value.toString().trim() === "") {
                    oControl.setValueState("Error");
                    oControl.setValueStateText(field.name + " is required");
                    bValid = false;
                } else {
                    oControl.setValueState("None");
                }
            }, this)
            var oDatePicker = this.byId("crCreateDate");
            if (!oDatePicker.getDateValue() || !oDatePicker.getValue()) {
                oDatePicker.setValueState("Error");

                bValid = false;
            } else {
                oDatePicker.setValueState("None");
                // oEntry.createDate = oDatePicker.getDateValue();
            }
            if (!bValid) {
                MessageToast.show("Please fill all required fields");
                return;
            }
            if (oEntry.number) {
                oEntry.number = oEntry.number.toString().toUpperCase();
            }
            if (oEntry.changeRequest) {
                oEntry.changeRequest = oEntry.changeRequest.toString().toUpperCase();
            }
            if (oEntry.number && !oEntry.number.toUpperCase().startsWith("CTASK")) {
                MessageBox.warning("You may have entered the wrong change request number. It should start with 'CTASK'. Please verify.");
                return;
            }


            oEntry.onHoldcheck = this.byId("crOnHold").getSelected() ? "Y" : "N";
            var oVistex = this.byId("crVistex").getSelectedButton();
            oEntry.vistexcheck = oVistex.getSelected() ? oVistex.getText() : "No";


            var oDatePicker = this.byId("crCreateDate");
            if (oDatePicker.getDateValue()) {
                oEntry.createDate = oDatePicker.getDateValue();
            }
            oEntry.updateDate = new Date();
            oEntry.taskType = "CHG";
            oEntry.createdUser = that.empname;
            const { isEditable, ...payload } = oEntry;

            oModel.create("/TaskManagement", payload, {
                success: function () {
                    MessageToast.show("Change Request created successfully");
                    this.crqoDialog.close();
                    this.readdata();
                }.bind(this),
                error: function (err) {
                    var sResponse = err.responseText;
                    var psresponse = JSON.parse(sResponse)
                    if (psresponse.error.message.value) {
                        MessageBox.error("Changerequest number already exists. Please use a different number.");

                    } else {
                        MessageBox.error("Creation failed");
                    }
                }
            })
        },
        // onCreatePress: function () {
        //     var oEntry = this.getView().getModel("ChangeRequestModel").getData();
        //     var oModel = this.getView().getModel();
        //     oEntry.onHoldcheck = sap.ui.getCore().byId("crOnHold").getSelected() ? "Y" : "N";

        //     var oVistex = sap.ui.getCore().byId("crVistex").getSelectedButton();
        //     oEntry.vistexcheck = oVistex.getSelected() ? oVistex.getText() : "No";

        //     oEntry.number = parseInt(oEntry.number, 10);
        //     var oDatePicker = sap.ui.getCore().byId("crCreateDate");
        //     if (oDatePicker.getDateValue()) {
        //         oEntry.createDate = oDatePicker.getDateValue(); 
        //     }

        //     // oEntry.createDate = new Date();
        //     oEntry.updateDate = new Date();
        //     oEntry.taskType = "CHG"

        //     oModel.create("/TaskManagement", oEntry, {
        //         success: function (odata) {
        //             MessageToast.show("Change Request created successfully");
        //             this.oDialog.close();
        //             this.readdata();
        //         }.bind(this),
        //         error: function (err) {
        //             MessageBox.error("Creation failed");
        //         }
        //     });
        // },
        // onDeletePress: function () {
        //     var oTable = this.byId("changeRequestTable");
        //     var oSelected = oTable.getSelectedItem();
        //     if (!oSelected) {
        //         MessageToast.show("Select a record to delete");
        //         return;
        //     }
        //     var sPath = oSelected.getBindingContext("TaskDataModel").getPath();
        //     this.getView().getModel().remove(sPath, {
        //         success: () => {
        //             MessageToast.show("Deleted successfully");
        //             this.readdata();
        //         },
        //         error: () => {
        //             MessageBox.error("Delete failed");
        //         }
        //     });
        // },
        onDeletePress: function () {
            var oTable = this.byId("changeRequestTable");
            var oSelected = oTable.getSelectedItem();

            if (!oSelected) {
                MessageToast.show("Select a record to delete");
                return;
            }
            var oContext = oSelected.getBindingContext("TaskDataModel");
            var oData = oContext.getObject();

            var sPath = "/TaskManagement('" + oData.number + "')";

            var oODataModel = this.getView().getModel();
            oODataModel.remove(sPath, {
                success: () => {
                    MessageToast.show("Deleted successfully");
                    this.readdata();
                },
                error: () => {
                    MessageBox.error("Delete failed");
                }
            });
        },
        onCancelPress: function () {
            this.crqoDialog.close();
        },
        onpresshome: function () {
            that.component.navTo("RouteView1");
        },
        yesNoFormatter: function (sValue) {
            if (!sValue) return "";
            return sValue === "Y" ? "Yes" : sValue === "N" ? "No" : sValue;
        }
    });
});
