sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/Fragment",
], function (Controller, MessageToast, MessageBox, JSONModel, Filter, FilterOperator, Fragment) {
    "use strict";
    var that = this;

    return Controller.extend("com.taskmanagement.taskmanagement.controller.PRCDefects", {

        onInit: function () {
            this.router = this.getOwnerComponent().getRouter();
            that.Email = sap.ushell.Container.getService("UserInfo").getEmail();
            // that.Email = "test@gmail.com"
        },
        onFilterChange: function () {
            var oTable = this.byId("PRCDefectsTable");
            var oBinding = oTable.getBinding("items");
            var aFilters = [];

            var sStatus = this.byId("IdprcStatus").getSelectedKey();
            var sDeveloper = this.byId("idprcdeveloper").getSelectedKey();
            var oDateFrom = this.byId("idprcDateRange").getDateValue();
            var oDateTo = this.byId("idprcDateRange").getSecondDateValue();

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
                    path: "createdDate",
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
                    name: "com.taskmanagement.taskmanagement.Fragment.PRCSummaryPopover",
                    controller: this
                }).then(function (oPopover) {
                    oView.addDependent(oPopover);
                    return oPopover;
                });
            }

            // Read TaskManagement data
            var oModel = this.getView().getModel(); // OData model
            var that = this;

            oModel.read("/PRCDefects", {
                success: function (oData) {
                    // Filter only Incident tasks
                    var aIncidents = oData.results;

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
            this.byId("prcsummaryPopover").close();
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

        onAfterRendering: function () {
            this.readdata();
            this.getemployeename(that.Email);
            this.loadDevelopers();
            this.loadAnalysts();
        },

        onrefreshPress: function () {
            this.readdata();
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

        readdata: function () {
            var oModel = this.getView().getModel();

            oModel.read("/PRCDefects", {
                success: function (oData) {
                    var oJsonModel = new JSONModel(oData.results);
                    this.getView().setModel(oJsonModel, "TaskDataModel");
                }.bind(this),
                error: function () {
                    MessageBox.error("Failed to read PRC Defects data");
                }
            });
        },

        onAddPress: function () {
            this.openDialog({}, "Add");
        },

        onEditPress: function () {
            var oTable = this.byId("PRCDefectsTable");
            var oSelected = oTable.getSelectedItem();

            if (!oSelected) {
                MessageToast.show("Select a record to edit");
                return;
            }

            var oData = oSelected.getBindingContext("TaskDataModel").getObject();
            this.openDialog(oData, "Edit");
        },
        openDialog: function (oData, sMode) {
            var oView = this.getView();
            var oModel = new sap.ui.model.json.JSONModel(oData || {});
            oView.setModel(oModel, "PRCDefectsModel");
            if (!this.prcDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "com.taskmanagement.taskmanagement.Fragment.PRCDefectsDialog",
                    controller: this
                }).then(function (oDialog) {
                    this.prcDialog = oDialog;
                    this.getView().addDependent(oDialog);
                    this.openPRCDialog(sMode, oData, oModel);

                }.bind(this));
            } else {
                this.openPRCDialog(sMode, oData, oModel);
            }
        },
        openPRCDialog: function (sMode, oData, oModel) {
            this.resetValueStates();
            var oBtn = this.prcDialog.getBeginButton();
            if (oBtn) {
                if (sMode === "Add") {
                    oBtn.setText("Save");
                    oModel.setData({ ...oData, isEditable: true });
                } else if (sMode === "Edit") {
                    oBtn.setText("Update");
                    oModel.setData({ ...oData, isEditable: false });
                }
            }
            this.prcDialog.open();
        },
        // openDialog: function (oData, sMode) {
        //     var oModel = new JSONModel(oData || {});
        //     this.getView().setModel(oModel, "PRCDefectsModel");

        //     if (!this.prcDialog || this.prcDialog.length === 0) {
        //         this.prcDialog = sap.ui.xmlfragment(
        //             "com.taskmanagement.taskmanagement.Fragment.PRCDefectsDialog",
        //             this
        //         );
        //         this.getView().addDependent(this.prcDialog);
        //     }
        //     this.resetValueStates();
        //     var oBtn = this.prcDialog.getBeginButton();

        //     if (sMode === "Add") {
        //         oBtn.setText("Save");
        //         oModel.setData({ isEditable: true });
        //     } else if (sMode === "Edit") {
        //         oBtn.setText("Update");
        //         oModel.setData({ ...oData, isEditable: false });
        //     }

        //     this.prcDialog.open();
        // },


        resetValueStates: function () {
            const aIds = [
                "idInput",
                "titleInput",
                "descriptionInput",
                "assignedToInput",
                "priorityInput",
                "statusInput",
                "effortInput",
                "createdDateInput",
                "createdByInput"
            ];

            aIds.forEach(id => {
                const oControl = sap.ui.getCore().byId(id);
                if (oControl && oControl.setValueState) {
                    oControl.setValueState("None");
                }
            });
        },


        onCreateupdatePress: function (oEvent) {
            var sText = oEvent.getSource().getText();
            if (sText === "Save") {
                this.onCreatePress();
            } else {
                this.onCreatePress();
            }
        },

        // onCreatePress: function () {
        //     var oEntry = this.getView().getModel("PRCDefectsModel").getData();
        //     var oModel = this.getView().getModel();

        //     // set created date from DatePicker (if available)
        //     var oDatePicker = sap.ui.getCore().byId("createdDateInput");
        //     if (oDatePicker && oDatePicker.getDateValue()) {
        //         oEntry.createdDate = oDatePicker.getDateValue();
        //     } else {
        //         oEntry.createdDate = new Date();
        //     }
        //     const { isEditable, ...payload } = oEntry;
        //     oModel.create("/PRCDefects", payload, {
        //         success: function () {
        //             MessageToast.show("PRC Defect created successfully");
        //             this.prcDialog.close();
        //             this.readdata();
        //         }.bind(this),
        //         error: function () {
        //             MessageBox.error("Creation failed");
        //         }
        //     });
        // },

        onCreatePress: function () {
            var oEntry = this.getView().getModel("PRCDefectsModel").getData();
            oEntry.createdUser = that.empname;
            var oModel = this.getView().getModel();

            // --- Required fields ---
            var aRequiredFields = [
                { id: "idInput", value: oEntry.id, name: "ID" },
                { id: "titleInput", value: oEntry.title, name: "Title" },
                { id: "descriptionInput", value: oEntry.description, name: "Description" },
                { id: "assignedToInput", value: oEntry.assignedTo, name: "Assigned To" },
                { id: "priorityInput", value: oEntry.priority, name: "Priority" },
                { id: "statusInput", value: oEntry.status, name: "Status" },
                { id: "effortInput", value: oEntry.effort, name: "Effort" },
                { id: "createdDateInput", value: oEntry.createdDate, name: "Created Date" },
                { id: "createdByInput", value: oEntry.createdBy, name: "Created By" }
            ];

            // var bValid = true;
            // aRequiredFields.forEach(function (field) {
            //     var oControl = sap.ui.getCore().byId(field.id);
            //     if (!field.value || field.value.toString().trim() === "") {
            //         oControl.setValueState("Error");
            //         oControl.setValueStateText(field.name + " is required");
            //         bValid = false;
            //     } else {
            //         oControl.setValueState("None");
            //     }
            // });

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

            if (!bValid) {
                MessageToast.show("Please fill all required fields");
                return;
            }

            // --- Prepare additional data ---
            // oEntry.updateDate = new Date();

            // Remove any internal fields like isEditable
            const { isEditable, ...payload } = oEntry;

            // --- Create or Update OData entry ---
            if (this.prcDialog.getBeginButton().getText() === "Save") {
                // Create
                oModel.create("/PRCDefects", payload, {
                    success: function () {
                        MessageToast.show("PRCDefects created successfully");
                        this.prcDialog.close();
                        this.readdata();
                    }.bind(this),
                    error: function () {
                        MessageBox.error("Creation failed");
                    }
                });
            } else {
                // Update
                oModel.update("/PRCDefects(" + oEntry.id + ")", payload, {
                    success: function () {
                        MessageToast.show("PRCDefects updated successfully");
                        this.prcDialog.close();
                        this.readdata();
                    }.bind(this),
                    error: function () {
                        MessageBox.error("Update failed");
                    }
                });
            }
        },

        // onUpdatePress: function () {
        //     var oEntry = this.getView().getModel("PRCDefectsModel").getData();
        //     var oModel = this.getView().getModel();

        //     // remove unwanted transient props
        //     const { isEditable, ...payload } = oEntry;

        //     oModel.update("/PRCDefects(" + oEntry.id + ")", payload, {
        //         success: function () {
        //             MessageToast.show("PRC Defect updated successfully");
        //             this.prcDialog.close();
        //             this.readdata();
        //         }.bind(this),
        //         error: function () {
        //             MessageBox.error("Update failed");
        //         }
        //     });
        // },

        onDeletePress: function () {
            var oTable = this.byId("PRCDefectsTable");
            var oSelected = oTable.getSelectedItem();

            if (!oSelected) {
                MessageToast.show("Select a record to delete");
                return;
            }

            var oData = oSelected.getBindingContext("TaskDataModel").getObject();
            var sPath = "/PRCDefects(" + oData.id + ")";

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
            this.prcDialog.close();
        },

        onpresshome: function () {
            this.router.navTo("RouteView1");
        },
        getToday: function () {
            return new Date();
        }
    });
});
