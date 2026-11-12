const cds = require('@sap/cds');
const { SELECT, UPDATE } = require('@sap/cds/lib/ql/cds-ql');

module.exports = cds.service.impl(async function () {
    const { Equipment, EquipmentLocation, MaintenancePlan, MaintenanceRequest, Technician, WorkOrder } = this.entities;

    //-------------------------------------------Equipment-------------------------------------------//
    this.before('CREATE', Equipment, async (req) => {
        const { equipmentName, category, modelNumber, critical, equipmentStatus, warrantyStart, warrantyEnd } = req.data;
        console.log(req.data);

        if (!equipmentName || !category || !modelNumber || !critical || !equipmentStatus || !warrantyStart || !warrantyEnd) {
            return req.error(400, 'Please Fill All The Mandatory Fields')
        }
        const equipID = await SELECT.one.from(Equipment)
            .columns('equipmentID')
            .orderBy('equipmentID desc');
        let nextNumber = 1;
        if (equipID?.equipmentID) {
            const lastNumber = parseInt(equipID.equipmentID.split("-")[1], 10);
            nextNumber = lastNumber + 1;
        }
        req.data.equipmentID = `EQ-${String(nextNumber).padStart(3, "0")}`;

        if (warrantyStart && warrantyEnd && warrantyEnd < warrantyStart) {
            return req.error(400, 'Warranty End Date cannot be before Warranty Start Date');
        }

        const status = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
        if (req.data.critical && !status.includes(req.data.critical)) {
            return req.error(400, 'Invalid Value')
        }

        const estatus = ['ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE'];
        if (req.data.equipmentStatus && !estatus.includes(req.data.equipmentStatus)) {
            return req.error(400, 'Invalid Equipment Status Value');
        }
    });

    this.before('UPDATE', Equipment, async (req) => {
        const equipmentID = req.data.ID || req.params?.[0]?.ID;
        const { equipmentName, category, modelNumber, critical, equipmentStatus, warrantyStart, warrantyEnd } = req.data;
        if (!equipmentName || !category || !modelNumber || !critical || !equipmentStatus || !warrantyStart || !warrantyEnd) {
            return req.error(400, 'Please Fill All The Mandatory Fields')
        }
        const equipment = await SELECT.one.from(Equipment)
            .where({ ID: equipmentID });
        if (!equipment) {
            return req.error(400, 'EquipmentID does not exists')
        }
        if (warrantyStart && warrantyEnd && warrantyEnd < warrantyStart) {
            return req.error(400, 'Warranty End Date cannot be before Warranty Start Date');
        }
    });

    //------------------------------------------------Equipment Location-------------------------------------------------//
    this.before('CREATE', EquipmentLocation, async (req) => {
        const location = await SELECT.one.from(EquipmentLocation)
            .columns('locationID')
            .orderBy('locationID desc');
        let nextNumber = 1;
        if (location?.locationID) {
            const lastNumber = parseInt(location.locationID.split("-")[1], 10);
            nextNumber = lastNumber + 1;
        }
        req.data.locationID = `LOC-${String(nextNumber).padStart(3, "0")}`;
    });

    //-------------------------------------------Maintenance Plan-------------------------------------------------//
    this.before('CREATE', MaintenancePlan, async (req) => {
        const equipment = req.data.equipment_ID;
        if (!equipment) {
            return req.error(400, 'Please select an Equipment')
        }
        const equip = await SELECT.one.from(Equipment)
            .where({ equipmentID: equipment })
        console.log(equip);

        if (!equip) {
            return req.error(404, 'Selected Equipment ID does not exist');
        }
        if (equip.equipmentStatus !== 'ACTIVE') {
            return req.error(404, 'Selected Equipment ID is not active');
        }

        const plan = await SELECT.one.from(MaintenancePlan)
            .columns('planID')
            .orderBy('planID desc');
        let nextNumber = 1;
        if (plan?.planID) {
            const lastNumber = parseInt(plan.planID.split("-")[1], 10);
            nextNumber = lastNumber + 1;
        }
        req.data.planID = `PL-${String(nextNumber).padStart(3, "0")}`;
    });

    //-----------------------------Maintanence Request---------------------------//
    this.before('CREATE', MaintenanceRequest, async (req) => {
        const request = await SELECT.one.from(MaintenanceRequest)
            .columns('requestID')
            .orderBy('requestID desc');
        let nextNumber = 1;
        if (request?.requestID) {
            const lastNumber = parseInt(request.requestID.split("-")[1], 10);
            nextNumber = lastNumber + 1;
        }
        req.data.requestID = `REQ-${String(nextNumber).padStart(3, "0")}`;

        const equipment = req.data.equipment_ID;
        const equip = await SELECT.one.from(Equipment)
            .where({ equipmentID: equipment })
        if (!equip) {
            return req.error(400, 'Please select an equiment');
        }
        await UPDATE(Equipment)
            .set({ equipmentStatus: 'INACTIVE' })
            .where({ equipmentID: equipment });
    });

    //----------------------------Maintainenace Request - Approve Action ----------------//
    this.on('ApproveRequest', MaintenanceRequest, async (req) => {
        const { ID } = req.params[0];
        const request = await SELECT.one.from(MaintenanceRequest).where({ ID });
        if (!request) {
            return req.error(404, 'Maintenance request is not found');
        }
        if (requestStatus !== 'SUBMITTED') {
            return req.error(400, 'Only Submitted Request can be Approved');
        }
        await UPDATE(MaintenanceRequest).set({ requestStatus: 'APPPROVED' })
            .where({ ID });
    })

    //--------------Reject---------//
    this.on('RejectRequest', MaintenanceRequest, async (req) => {
        const { ID } = req.params[0];
        const request = await SELECT.one.from(MaintenanceRequest).where({ ID });
        if (!request) {
            return req.error(404, 'Maintenance request is not found');
        }
        if (requestStatus !== 'SUBMITTED') {
            return req.error(400, 'Only Submitted Request can be Rejected');
        }
        await UPDATE(MaintenanceRequest).set({ requestStatus: 'REJECTED' })
            .where({ ID });
    })

    //-------------------Cancel----------------------//
    this.on('CancelRequest', MaintenanceRequest, async (req) => {
        const { ID } = req.params[0];
        const request = await SELECT.one.from(MaintenanceRequest).where({ ID });
        if (!request) {
            return req.error(404, 'Maintenance request is not found');
        }
        if (requestStatus !== 'SUBMITTED') {
            return req.error(400, 'Only Submitted Request can be Cancelled');
        }
        await UPDATE(MaintenanceRequest).set({ requestStatus: 'CANCELLED' })
            .where({ ID });
    })
    //------------------------------Technician-----------------------------------//
    this.before('CREATE', Technician, async (req) => {
        const last = await SELECT.one.from(Technician)
            .columns('empCode')
            .orderBy('empCode desc');
        let nextNumber = 1;
        if (last?.empCode) {
            const lastNumber = parseInt(last.empCode.split("-")[1], 10);
            nextNumber = lastNumber + 1;
        }
        req.data.empCode = `TECH-${String(nextNumber).padStart(3, "0")}`;

        if (req.data.phone && !/^\d{10}$/.test(req.data.phone)) {
            return req.error(400, 'Please enter a valid phone number');
        }
        if (req.data.email && !/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(req.data.email)) {
            return req.error(400, 'Please enter a valid email address');
        }
    });

    // //----------------------------------Work Order----------------------//
    this.before('CREATE', WorkOrder, async (req) => {
        const status = req.data.request_ID;
        const request = await SELECT.one.from(MaintenanceRequest)
            .where({ requestID: status });

        if (!request) {
            return req.reject(404, 'Maintenance Request not found');
        }

        if (request.requestStatus !== 'APPROVED') {
            req.reject(400, 'Request must be approved before creating Work Order');
        }

        const work = await SELECT.one.from(WorkOrder)
            .columns('orderID')
            .orderBy('orderID desc');
        let nextNumber = 1;
        if (work?.orderID) {
            const lastNumber = parseInt(work.orderID.split("-")[1], 10);
            nextNumber = lastNumber + 1;
        }
        req.data.orderID = `ORD-${String(nextNumber).padStart(3, "0")}`;

        const technician = req.data.planner_ID;
        const planner = await SELECT.one.from(Technician)
                                        .where({empCode:technician});
        if(planner.availableStatus!=='AVAILABLE'){
            return req.error(400,'The Technician is not available at the moment');
        }
        await UPDATE(MaintenanceRequest).set({requestStatus: 'CREATED'}).where({requestID: status})
    })
})
