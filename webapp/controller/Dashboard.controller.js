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
    that.count = 1;

    return Controller.extend("com.taskmanagement.taskmanagement.controller.Dashboard", {

        onInit: function () {
            this.router = this.getOwnerComponent().getRouter();
            // that.Email = sap.ushell.Container.getService("UserInfo").getEmail();
            that.Email = "test@gmail.com"
        },
        onAfterRendering: function () {
            this.onemployeedataread();
        },


        onApplyFilter: function () {
            that.oView = this.getView();
            that.oModel = that.oView.getModel();
            // if (that.count === 1) {
            //     that.oModel = that.oView.getModel();
            // }
            function toISODateString(date) {
                if (!date) return null;
                return date.toISOString(); // "2025-10-02T00:00:00.000Z"
            }

            const taskType = oView.byId("taskTypeCombo").getSelectedKey();
            // let employeeId = oView.byId("employeeCombo")._lastValue;
            const startDate = oView.byId("startDatePicker").getDateValue();
            const endDate = oView.byId("endDatePicker").getDateValue();
            const chartType = oView.byId("chartTypeCombo").getSelectedKey();

            // if (employeeId === "All Employees") {
            //     employeeId = "";
            // }

            const oEmployeeMultiCombo = this.getView().byId("employeeMultiCombo");
            const aSelectedItems = oEmployeeMultiCombo.getSelectedItems();
            let aEmployeeIds = [];

            if (aSelectedItems.length === 1 && aSelectedItems[0].getKey() === "ALL") {
                // All employees selected
                aEmployeeIds = [];
            } else {
                aEmployeeIds = aSelectedItems.map(item => item.getText());
            }


            let aFilters = [];

            if (aEmployeeIds.length > 0) {
                const aEmpFilters = aEmployeeIds.map(id => new Filter("createdUser", FilterOperator.EQ, id));
                aFilters.push(new Filter({ filters: aEmpFilters, and: false })); // OR filter
            }

            let sEntitySet = "";
            if (startDate) startDate.setHours(0, 0, 0, 0);  // start of day
            if (endDate) endDate.setHours(23, 59, 59, 999); // end of day

            if (taskType === "INC" || taskType === "CHG") {
                sEntitySet = "/TaskManagement";
                aFilters.push(new Filter("taskType", FilterOperator.EQ, taskType));
                // if (employeeId) aFilters.push(new Filter("createdUser", FilterOperator.EQ, employeeId));
                // if (startDate) aFilters.push(new Filter("createDate", FilterOperator.GE, toISODateString(startDate)));
                // if (endDate) aFilters.push(new Filter("createDate", FilterOperator.LE, toISODateString(endDate)));
            } else if (taskType === "DEF") {
                sEntitySet = "/PRCDefects";
                // if (employeeId) aFilters.push(new Filter("createdBy", FilterOperator.EQ, employeeId));
                // if (startDate) aFilters.push(new Filter("createdDate", FilterOperator.GE, startDate));
                // if (endDate) aFilters.push(new Filter("createdDate", FilterOperator.LE, endDate));
            } else {
                MessageToast.show("Please select a valid Task Type.");
                return;
            }

            // Fetch data
            that.oModel.read(sEntitySet, {
                filters: aFilters,
                success: (oData) => {
                    that.count++;
                    let aResults = oData.results;

                    // Apply date filter in JS
                    if (startDate) startDate.setHours(0, 0, 0, 0);
                    if (endDate) endDate.setHours(23, 59, 59, 999);

                    if (startDate || endDate) {
                        aResults = aResults.filter(item => {
                            const d = new Date(item.createDate || item.createdDate);
                            if (startDate && d < startDate) return false;
                            if (endDate && d > endDate) return false;
                            return true;
                        });
                    }
                    this.prepareChartData(aResults, taskType, chartType);
                },
                error: () => {
                    MessageToast.show("Error fetching data from backend.");
                }
            });
        },

        prepareChartData: function (aResults, taskType, chartType) {
            const oView = this.getView();

            if (!aResults || aResults.length === 0) {
                const oMainChart = oView.byId("mainChart");
                sap.m.MessageToast.show("No data available for the selected filters.");

                // Create a placeholder empty model
                const oEmptyModel = new sap.ui.model.json.JSONModel({
                    chartData: []
                });
                oView.setModel(oEmptyModel, "chartModel");

                // Rebind dataset to ensure chart remains valid for next updates
                const oEmptyDataset = new sap.viz.ui5.data.FlattenedDataset({
                    dimensions: [
                        new sap.viz.ui5.data.DimensionDefinition({
                            name: "No Data",
                            value: "{chartModel>NoData}"
                        })
                    ],
                    measures: [
                        new sap.viz.ui5.data.MeasureDefinition({
                            name: "Count",
                            value: "{chartModel>Count}"
                        })
                    ],
                    data: { path: "chartModel>/chartData" }
                });
                oMainChart.setDataset(oEmptyDataset);

                // Keep feeds structure intact
                oMainChart.removeAllFeeds();
                oMainChart.addFeed(
                    new sap.viz.ui5.controls.common.feeds.FeedItem({
                        uid: "valueAxis",
                        type: "Measure",
                        values: ["Count"]
                    })
                );
                oMainChart.addFeed(
                    new sap.viz.ui5.controls.common.feeds.FeedItem({
                        uid: "categoryAxis",
                        type: "Dimension",
                        values: ["No Data"]
                    })
                );

                // Update chart title
                oMainChart.setVizProperties({
                    title: { text: "No Data Available", visible: true },
                    plotArea: { dataLabel: { visible: false } },
                    legend: { visible: false }
                });

                return;
            }

            let dimensionCounts = {}; // dimension -> { employee -> count }

            const dimensionField = chartType === "Type" ? "type" : "status";

            aResults.forEach(item => {
                const dimensionValue = (taskType === "DEF" && chartType === "Type") ? item.priority : item[dimensionField] || "Unknown";
                const emp = item.createdUser || "Unknown";

                if (!dimensionCounts[dimensionValue]) dimensionCounts[dimensionValue] = {};
                dimensionCounts[dimensionValue][emp] = (dimensionCounts[dimensionValue][emp] || 0) + 1;
            });

            const aChartData = [];
            const employeesSet = new Set();

            Object.keys(dimensionCounts).forEach(dim => {
                const row = { dimension: dim };
                Object.keys(dimensionCounts[dim]).forEach(emp => {
                    row[emp] = dimensionCounts[dim][emp];
                    employeesSet.add(emp);
                });
                aChartData.push(row);
            });

            const aEmployees = Array.from(employeesSet);

            const oChartModel = new sap.ui.model.json.JSONModel({
                chartData: aChartData
            });
            oView.setModel(oChartModel, "chartModel");

            // Configure VizFrame
            const oMainChart = oView.byId("mainChart");
            oMainChart.setVizProperties({
                plotArea: {
                    dataLabel: { visible: true },
                    tooltip: {
                        visible: true,
                        formatString: "#,##0",
                        renderer: function (oTooltip) {
                            // Customize tooltip text
                            const dim = oTooltip.data[0].data["dimension"];
                            const measureName = oTooltip.data[0].data.context.sPath.split("/").pop(); // employee name
                            const value = oTooltip.data[0].data[measureName];
                            return `${measureName}\n${chartType}: ${dim}\nCount: ${value}`;
                        }
                    }
                },
                legend: { visible: true },
                title: { visible: true, text: `Task Count by ${chartType}` },
                categoryAxis: { title: { visible: true } },
                valueAxis: {
                    title: { visible: false },
                    label: { visible: false },
                    axisLine: { visible: false },
                    referenceLine: { visible: false }
                }
            });

            // Bind dataset
            const oDataset = new sap.viz.ui5.data.FlattenedDataset({
                dimensions: [
                    new sap.viz.ui5.data.DimensionDefinition({
                        name: chartType,
                        value: "{dimension}"
                    })
                ],
                measures: aEmployees.map(emp => ({
                    name: emp,
                    value: `{${emp}}`
                })),
                data: { path: "chartModel>/chartData" }
            });

            oMainChart.setDataset(oDataset);

            // Bind feeds
            oMainChart.removeAllFeeds();
            oMainChart.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                uid: "valueAxis",
                type: "Measure",
                values: aEmployees
            }));
            oMainChart.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                uid: "categoryAxis",
                type: "Dimension",
                values: [chartType]
            }));
        },
        onemployeedataread: function () {
            var oModeldata = this.getView().getModel();
            oModeldata.read("/Employee", {
                success: (oData) => {
                    const aEmployees = [{ id: "ALL", name: "All Employees" }].concat(oData.results);
                    const oEmployeeModel = new sap.ui.model.json.JSONModel({
                        Employee: aEmployees
                    });

                    this.getView().setModel(oEmployeeModel, "employeeModel");
                },
                error: (oError) => {
                    sap.m.MessageToast.show("Failed to load Employee data.");
                    console.error(oError);
                }
            });

        },
        onEmployeeSelectionChange: function (oEvent) {
            const oMultiCombo = oEvent.getSource();
            const oChangedItem = oEvent.getParameter("changedItem");
            const bSelected = oEvent.getParameter("selected");

            if (!oChangedItem) return;

            const sKey = oChangedItem.getKey();
            const aItems = oMultiCombo.getItems();

            if (sKey === "ALL") {
                // If "All Employees" selected, select all employees
                if (bSelected) {
                    aItems.forEach(item => {
                        if (item.getKey() !== "ALL") {
                            oMultiCombo.addSelectedItem(item);
                        }
                    });
                } else {
                    // If "All Employees" deselected, remove all selections
                    oMultiCombo.removeAllSelectedItems();
                }
            } else {
                // If any individual employee is deselected, remove "All Employees" selection
                if (!bSelected) {
                    const oAllItem = aItems.find(item => item.getKey() === "ALL");
                    if (oAllItem) oMultiCombo.removeSelectedItem(oAllItem);
                } else {
                    // If all individual employees are selected manually, mark "All Employees" as selected
                    const allEmployeeKeys = aItems
                        .filter(item => item.getKey() !== "ALL")
                        .map(item => item.getKey());
                    const selectedKeys = oMultiCombo.getSelectedKeys().filter(k => k !== "ALL");

                    if (allEmployeeKeys.length === selectedKeys.length) {
                        const oAllItem = aItems.find(item => item.getKey() === "ALL");
                        if (oAllItem) oMultiCombo.addSelectedItem(oAllItem);
                    }
                }
            }
        },

        // onApplyFilter: function () {
        //     that.oView = this.getView();
        //     if (that.count === 1) {
        //         that.oModel = that.oView.getModel();
        //     }

        //     // Get selected values
        //     const taskType = that.oView.byId("taskTypeCombo").getSelectedKey();  // "INC", "CHG", or "DEF"
        //     const employeeId = that.oView.byId("employeeCombo")._lastValue;
        //     const startDate = that.oView.byId("startDatePicker").getDateValue();
        //     const endDate = that.oView.byId("endDatePicker").getDateValue();
        //     const chartType = oView.byId("chartTypeCombo").getSelectedKey();

        //     // Prepare filters
        //     let aFilters = [];

        //     // Determine the correct entity to read
        //     let sEntitySet = "";

        //     if (taskType === "INC" || taskType === "CHG") {
        //         sEntitySet = "/TaskManagement";
        //         aFilters.push(new Filter("taskType", FilterOperator.EQ, taskType));
        //         if (employeeId) {
        //             aFilters.push(new Filter("createdUser", FilterOperator.EQ, employeeId));
        //         }
        //         if (startDate) {
        //             aFilters.push(new Filter("createDate", FilterOperator.GE, startDate));
        //         }
        //         if (endDate) {
        //             aFilters.push(new Filter("createDate", FilterOperator.LE, endDate));
        //         }
        //     } else if (taskType === "DEF") {
        //         sEntitySet = "/PRCDefects";
        //         if (employeeId) {
        //             aFilters.push(new Filter("createdBy", FilterOperator.EQ, employeeId));
        //         }
        //         if (startDate) {
        //             aFilters.push(new Filter("createdDate", FilterOperator.GE, startDate));
        //         }
        //         if (endDate) {
        //             aFilters.push(new Filter("createdDate", FilterOperator.LE, endDate));
        //         }
        //     } else {
        //         MessageToast.show("Invalid task type selected");
        //         return;
        //     }

        //     // Now read the data from the correct entity
        //     that.oModel.read(sEntitySet, {
        //         filters: aFilters,
        //         success: (oData) => {
        //             const aResults = oData.results;
        //             that.count++;
        //             // Aggregation logic
        //             const typeCounts = {};
        //             const statusCounts = {};

        //             aResults.forEach(item => {
        //                 const type = (taskType === "DEF") ? item.title : item.type; // DEF doesn't have a 'type', so use 'title' or hardcoded
        //                 const status = item.status;

        //                 if (type) {
        //                     typeCounts[type] = (typeCounts[type] || 0) + 1;
        //                 }
        //                 if (status) {
        //                     statusCounts[status] = (statusCounts[status] || 0) + 1;
        //                 }
        //             });

        //             // Prepare chart data
        //             const aTypeChartData = Object.keys(typeCounts).map(type => ({
        //                 type: type,
        //                 count: typeCounts[type]
        //             }));

        //             const aStatusChartData = Object.keys(statusCounts).map(status => ({
        //                 status: status,
        //                 count: statusCounts[status]
        //             }));

        //             // Set chart data model
        //             const oChartModel = new JSONModel({
        //                 typeChartData: aTypeChartData,
        //                 statusChartData: aStatusChartData
        //             });
        //             that.oView.setModel(oChartModel);

        //             // Configure chart visuals
        //             const oTypeChart = that.oView.byId("typeChart");
        //             const oStatusChart = that.oView.byId("statusChart");

        //             if (oTypeChart) {
        //                 oTypeChart.setVizProperties({
        //                     plotArea: {
        //                         dataLabel: {
        //                             visible: true,
        //                             formatString: "#,##0"
        //                         }
        //                     },
        //                     legend: { visible: true },
        //                     title: {
        //                         visible: true,
        //                         text: "Task Count by Type"
        //                     }
        //                 });
        //             }

        //             if (oStatusChart) {
        //                 oStatusChart.setVizProperties({
        //                     plotArea: {
        //                         dataLabel: {
        //                             visible: true,
        //                             formatString: "#,##0"
        //                         }
        //                     },
        //                     legend: { visible: true },
        //                     title: {
        //                         visible: true,
        //                         text: "Task Count by Status"
        //                     }
        //                 });
        //             }
        //         },
        //         error: (oError) => {
        //             MessageToast.show("Error reading data.");
        //         }
        //     });
        // },


        onpresshome: function () {
            this.router.navTo("RouteView1");
        }
    });
});
