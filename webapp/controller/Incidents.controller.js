sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment"
], function (Controller, MessageToast, MessageBox, JSONModel, Fragment) {
    "use strict";
    var that = this;

    return Controller.extend("com.taskmanagement.taskmanagement.controller.Incidents", {

        onInit: function () {
            that.component = this.getOwnerComponent().getRouter().initialize();
            // that.Email = sap.ushell.Container.getService("UserInfo").getEmail();
            that.Email = "saipavanbassa@sbpcorp.com"

            var oTable = this.byId("Incidents");
            oTable.setModel(this.getView().getModel());
        },
        onAfterRendering: function () {
            this.readdata();
            this.getemployeename(that.Email)
            this.loadDevelopers();
            this.loadAnalysts();
        },
        onFilterChange: function () {
            var oTable = this.byId("Incidents");
            var oBinding = oTable.getBinding("items");
            var aFilters = [];

            var sStatus = this.byId("IdincStatus").getSelectedKey();
            var sDeveloper = this.byId("idincdeveloper").getSelectedKey();
            var oDateFrom = this.byId("idincDateRange").getDateValue();
            var oDateTo = this.byId("idincDateRange").getSecondDateValue();

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
        },

        onShowsummary: function (oEvent) {
            var oView = this.getView();
            var oButton = oEvent.getSource();

            // Lazy load fragment
            if (!this.pSummaryPopover) {
                this.pSummaryPopover = Fragment.load({
                    id: oView.getId(),
                    name: "com.taskmanagement.taskmanagement.Fragment.INCSummaryPopover",
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
                    var aIncidents = oData.results.filter(item => item.taskType === "INC");

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
                    that.pSummaryPopover.then(function (oPopover) {
                        oPopover.openBy(oButton);
                    });

                },
                error: function (oError) {
                    sap.m.MessageToast.show("Error fetching TaskManagement data");
                }
            });
        },

        onCloseSummary: function () {
            this.byId("summaryPopover").close();
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

        // onAddNewDeveloper: function () {
        //     var that = this;

        //     // If dialog already exists, open it
        //     if (this.oAddEmployeeDialog) {
        //         this.oAddEmployeeDialog.open();
        //         return;
        //     }

        //     // Create the dialog once
        //     this.oAddEmployeeDialog = new sap.m.Dialog({
        //         title: "Add New Developer",
        //         type: "Message",
        //         content: [
        //             new sap.m.Label({ text: "Enter developer name:", labelFor: "empInput" }),
        //             new sap.m.Input("empInput", { width: "100%" })
        //         ],

        //         beginButton: new sap.m.Button({
        //             text: "Add",
        //             press: function () {
        //                 var sNewName = sap.ui.getCore().byId("empInput").getValue().trim();

        //                 if (sNewName) {
        //                     var sNewId = that.generateEmployeeId();

        //                     var oModel = that.getView().getModel();
        //                     var oNewEmployee = {
        //                         id: sNewId,
        //                         name: sNewName,
        //                         role: "D" // Developer
        //                     };

        //                     oModel.create("/Employee", oNewEmployee, {
        //                         success: function () {
        //                             sap.m.MessageToast.show("Developer added successfully!");
        //                             that.loadDevelopers();
        //                         },
        //                         error: function () {
        //                             sap.m.MessageBox.error("Failed to add developer.");
        //                         }
        //                     });

        //                     that.oAddEmployeeDialog.close();
        //                 } else {
        //                     sap.m.MessageBox.warning("Please enter a name.");
        //                 }
        //             }
        //         }),

        //         endButton: new sap.m.Button({
        //             text: "Cancel",
        //             press: function () {
        //                 that.oAddEmployeeDialog.close();
        //             }
        //         }),

        //         afterClose: function () {
        //             sap.ui.getCore().byId("empInput").setValue("");
        //         }
        //     });

        //     // Add to view dependents for cleanup
        //     this.getView().addDependent(this.oAddEmployeeDialog);
        //     this.oAddEmployeeDialog.open();
        // },

        onAddPress: function () {
            this.openDialog(undefined, "Add");
        },

        onrefreshPress: function () {
            this.readdata();
        },
        readdata: function () {
            var oModel = this.getView().getModel();
            var oFilter = new sap.ui.model.Filter("taskType", sap.ui.model.FilterOperator.EQ, "INC");

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
            var oTable = this.byId("Incidents");
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
        //     this.getView().setModel(oModel, "IncidentModel");

        //     if (!this.oDialog) {
        //         this.oDialog = sap.ui.xmlfragment(
        //             "com.taskmanagement.taskmanagement.Fragment.IncidentDialog",
        //             this
        //         );
        //         this.getView().addDependent(this.oDialog);
        //     }
        //     var oBtn = this.oDialog.getBeginButton();
        //     if (sMode === "Add") {
        //         oBtn.setText("Save");
        //         oModel.setData({ isEditable: true });
        //     } else if (sMode === "Edit") {
        //         oBtn.setText("Update");
        //         oModel.setData({ ...oData, isEditable: false });
        //     }

        //     this.oDialog.bindElement("IncidentModel>/");

        //     this.oDialog.open();
        // },
        openDialog: function (oData, sMode) {
            var oModel = new sap.ui.model.json.JSONModel(oData || {});
            this.getView().setModel(oModel, "IncidentModel");

            if (!this.IoDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "com.taskmanagement.taskmanagement.Fragment.IncidentDialog",
                    controller: this
                }).then(function (oDialog) {
                    this.IoDialog = oDialog;
                    this.getView().addDependent(oDialog);
                    this.resetValueStates();
                    this.setupDialog(oModel, sMode);
                    this.IoDialog.open();
                }.bind(this));
            } else {
                this.setupDialog(oModel, sMode);
                this.resetValueStates();
                this.IoDialog.open();
            }
        },

        setupDialog: function (oModel, sMode) {
            var oBtn = this.IoDialog.getBeginButton();
            var oDateTimePicker = this.byId("ICreateDate");
            var oToday = new Date();
            oDateTimePicker.setMaxDate(oToday);

            if (sMode === "Add") {

                oBtn.setText("Save");
                oModel.setData({ isEditable: true });
            } else if (sMode === "Edit") {
                oBtn.setText("Update");
                oModel.setData({ ...oModel.getData(), isEditable: false });
            }
            this.IoDialog.bindElement("IncidentModel>/");
        },
        resetValueStates: function () {
            const aIds = [
                "IcrNumber",
                "incidents",
                "IcrStatus",
                "IcrBA",
                "IcrAssignedTo",
                "IcrDescription",
                "ICreateDate"
            ];

            aIds.forEach(id => {
                const oControl = this.byId(id);
                if (oControl && oControl.setValueState) {
                    oControl.setValueState("None");
                }
            });
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
            var oEntry = this.getView().getModel("IncidentModel").getData();
            var oModel = this.getView().getModel();

            var aRequiredFields = [
                { id: "IcrNumber", value: oEntry.number, name: "Number" },
                { id: "incidents", value: oEntry.changeRequest, name: "Incidents" },
                // { id: "IcrType", value: oEntry.type, name: "Type" },
                { id: "IcrStatus", value: oEntry.status, name: "Status" },
                { id: "IcrBA", value: oEntry.BA, name: "BA" },
                { id: "IcrAssignedTo", value: oEntry.assignedTo, name: "Assigned To" },
                { id: "IcrDescription", value: oEntry.description, name: "Description" }
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
            }, this);

            var oDatePicker = this.byId("ICreateDate");
            if (!oEntry.createDate) {
                oDatePicker.setValueState("Error");
                // oDatePicker.setValueStateText("Create Date is required");
                bValid = false;
            } else {
                oDatePicker.setValueState("None");
                oEntry.createDate = oEntry.createDate;
            }

            var oVistexGroup = this.byId("IcrVistex");
            var iSelectedIndex = oVistexGroup.getSelectedIndex();

            if (iSelectedIndex === -1) {
                MessageToast.show("Please select a Vistex option");
                bValid = false;
            } else {
                var oSelectedButton = oVistexGroup.getButtons()[iSelectedIndex];
                oEntry.vistexcheck = oSelectedButton.getText();
            }

            if (!bValid) {
                MessageToast.show("Please fill all required fields");
                return;
            }

            if (oEntry.number) {
                oEntry.number = oEntry.number.toUpperCase();
            }
            if (oEntry.changeRequest) {
                oEntry.changeRequest = oEntry.changeRequest.toUpperCase();
            }

            oEntry.onHoldcheck = this.byId("IcrOnHold").getSelected() ? "Y" : "N";
            var oVistex = this.byId("IcrVistex").getSelectedButton();
            oEntry.vistexcheck = oVistex.getSelected() ? oVistex.getText() : "No";

            oEntry.updateDate = new Date();
            const { isEditable, ...payload } = oEntry;


            oModel.update("/TaskManagement('" + oEntry.number + "')", payload, {
                success: function () {
                    MessageToast.show("Incidents updated successfully");
                    this.IoDialog.close();
                    this.readdata();
                }.bind(this),
                error: function () {
                    MessageBox.error("Update failed");
                }
            });

        },
        onCreatePress: function () {
            var oEntry = this.getView().getModel("IncidentModel").getData();
            var oModel = this.getView().getModel();


            var aRequiredFields = [
                { id: "IcrNumber", value: oEntry.number, name: "Number" },
                { id: "incidents", value: oEntry.changeRequest, name: "Incidents" },
                // { id: "IcrType", value: oEntry.type, name: "Type" },
                { id: "IcrStatus", value: oEntry.status, name: "Status" },
                { id: "IcrBA", value: oEntry.BA, name: "BA" },
                { id: "IcrAssignedTo", value: oEntry.assignedTo, name: "Assigned To" },
                { id: "IcrDescription", value: oEntry.description, name: "Description" }
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
            }, this);

            var oDatePicker = this.byId("ICreateDate");
            if (!oDatePicker.getDateValue()) {
                oDatePicker.setValueState("Error");
                // oDatePicker.setValueStateText("Create Date is required");
                bValid = false;
            } else {
                oDatePicker.setValueState("None");
                // oEntry.createDate = oDatePicker.getDateValue();
            }

            var oVistexGroup = this.byId("IcrVistex");
            var iSelectedIndex = oVistexGroup.getSelectedIndex();

            if (iSelectedIndex === -1) {
                MessageToast.show("Please select a Vistex option");
                bValid = false;
            } else {
                var oSelectedButton = oVistexGroup.getButtons()[iSelectedIndex];
                oEntry.vistexcheck = oSelectedButton.getText();
            }

            if (!bValid) {
                MessageToast.show("Please fill all required fields");
                return;
            }

            if (oEntry.number) {
                oEntry.number = oEntry.number.toUpperCase();
            }
            if (oEntry.changeRequest) {
                oEntry.changeRequest = oEntry.changeRequest.toUpperCase();
            }
            if (oEntry.number && !oEntry.number.toUpperCase().startsWith("TASK")) {
                MessageBox.warning("You may have entered the wrong number. For incidents, the number should start with 'TASK'. Please verify.");
                return;
            }

            oEntry.onHoldcheck = this.byId("IcrOnHold").getSelected() ? "Y" : "N";
            var oVistex = this.byId("IcrVistex").getSelectedButton();
            oEntry.vistexcheck = oVistex.getSelected() ? oVistex.getText() : "No";


            var oDatePicker = this.byId("ICreateDate");
            if (oDatePicker.getDateValue()) {
                oEntry.createDate = oDatePicker.getDateValue();
            }
            oEntry.updateDate = new Date();
            oEntry.taskType = "INC";
            oEntry.createdUser = that.empname;
            const { isEditable, ...payload } = oEntry;


            oModel.create("/TaskManagement", payload, {
                success: function (odata) {
                    MessageToast.show("Incident created successfully");
                    this.IoDialog.close();
                    this.readdata();
                }.bind(this),
                error: function (err) {
                    var sResponse = err.responseText;
                    var psresponse = JSON.parse(sResponse)
                    if (psresponse.error.message.value) {
                        MessageBox.error("Incident number already exists. Please use a different number.");

                    } else {
                        MessageBox.error("Creation failed");
                    }

                }
            });
        },
        // onCreatePress: function () {
        //     var oEntry = this.getView().getModel("IncidentModel").getData();
        //     var oModel = this.getView().getModel();
        //     oEntry.onHoldcheck = sap.ui.getCore().byId("IcrOnHold").getSelected() ? "Y" : "N";

        //     var oVistex = sap.ui.getCore().byId("IcrVistex").getSelectedButton();
        //     oEntry.vistexcheck = oVistex.getSelected() ? oVistex.getText() : "No";

        //     oEntry.number = parseInt(oEntry.number, 10);
        //     var oDatePicker = sap.ui.getCore().byId("ICreateDate");
        //     if (oDatePicker.getDateValue()) {
        //         oEntry.createDate = oDatePicker.getDateValue();
        //     }

        //     // oEntry.createDate = new Date();
        //     oEntry.updateDate = new Date();
        //     oEntry.taskType = "INC"

        //     oModel.create("/TaskManagement", oEntry, {
        //         success: function (odata) {
        //             MessageToast.show(" Incidents created successfully");
        //             this.oDialog.close();
        //             this.readdata();
        //         }.bind(this),
        //         error: function (err) {
        //             MessageBox.error("Creation failed");
        //         }
        //     });
        // },
        // onDeletePress: function () {
        //     var oTable = this.byId("Incidents");
        //     var oSelected = oTable.getSelectedItem();
        //     if (!oSelected) {
        //         MessageToast.show("Select a record to delete");
        //         return;
        //     }
        //     var sPath = oSelected.getBindingContext("TaskDataModel").getPath();
        //     this.getView().getModel().remove(sPath, {
        //         success: () => { MessageToast.show("Deleted successfully"), this.readdata() },
        //         error: () => MessageBox.error("Delete failed")
        //     });
        // },
        onDeletePress: function () {
            var oTable = this.byId("Incidents");
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
            this.IoDialog.close();
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
