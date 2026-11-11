const cds = require('@sap/cds');
const { data } = require('@sap/cds/lib/dbs/cds-deploy');
const { SELECT } = require('@sap/cds/lib/ql/cds-ql');
module.exports = cds.service.impl(async function () {
    const { Equipment, EquipmentLocation, MaintenancePlan } = this.entities;

    //-------------------------------------------Equipment-------------------------------------------//
    this.before('CREATE', Equipment, async(req)=>{
        const {equipmentName, category, modelNumber, critical, equipmentStatus, warrantyStart, warrantyEnd} = req.data;
        if(!equipmentName || !category || !modelNumber || !critical || !equipmentStatus || !warrantyStart || !warrantyEnd){
            return req.error(400, 'Please Fill All The Mandatory Fields')
        }
        const equipID = await SELECT.one.from(Equipment)
                                         .columns('equipmentID')
                                         .orderBy('equipmentID desc');
        let nextNumber = 1;
        if(equipID?.equipmentID){
            const lastNumber = parseInt(equipID.equipmentID.split("-")[1], 10);
            nextNumber = lastNumber + 1;
        }
        req.data.equipmentID = `EQ-${String(nextNumber).padStart(3,"0")}`;    

        if(warrantyStart && warrantyEnd && warrantyEnd < warrantyStart){
            return req.error(400, 'Warranty End Date cannot be before Warranty Start Date');
        }

        const status = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
        if (req.data.critical && !status.includes(req.data.critical)){
            return req.error(400,'Invalid Value')
        }

        const estatus = ['ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE'];
        if(req.data.equipmentStatus &&  !estatus.includes(req.data.equipmentStatus)){
            return req.error(400, 'Invalid Equipment Status Value');
        }
    });

    this.before('UPDATE', Equipment, async(req)=>{
        const equipmentID = req.data.ID || req.params?.[0]?.ID;
        const {equipmentName, category, modelNumber, critical, equipmentStatus, warrantyStart, warrantyEnd} = req.data;
        if(!equipmentName || !category || !modelNumber || !critical || !equipmentStatus || !warrantyStart || !warrantyEnd){
            return req.error(400, 'Please Fill All The Mandatory Fields')
        }
         const equipment = await SELECT.one.from(Equipment)
                                                .where({ID: equipmentID});
         if(!equipment){
            return req.error(400,'EquipmentID does not exists')
         }
         if(warrantyStart && warrantyEnd && warrantyEnd < warrantyStart){
            return req.error(400, 'Warranty End Date cannot be before Warranty Start Date');
        }
    });
   
    //------------------------------------------------Equipment Location-------------------------------------------------//
    this.before('CREATE', EquipmentLocation, async(req)=>{
        const location = await SELECT.one.from(EquipmentLocation)
                                              .columns('locationID')
                                              .orderBy('locationID desc');
        let nextNumber=1;
        if(location?.locationID){
            const lastNumber = parseInt(location.locationID.split("-")[1],10);
            nextNumber = lastNumber + 1;
        }
        req.data.locationID = `LOC-${String(nextNumber).padStart(3,"0")}`;
    });

    //-------------------------------------------Maintenance Plan-------------------------------------------------//
    this.before('CREATE', MaintenancePlan, async(req)=>{
        const plan = await SELECT.one.from(MaintenancePlan)
                                          .columns('planID')
                                          .orderBy('planID desc');
        let nextNumber = 1;
        if(plan?.planID){
            const lastNumber = parseInt(plan.planID.split("-")[1],10);
            nextNumber = lastNumber + 1;
        }
        req.data.planID = `PL-${String(nextNumber).padStart(3,"0")}`;

        const equipmentID = req.data.equipmentID;
        if(equipmentID){
            return req.error(400,'Please select the Equipment')
        }
        const equip = await SELECT.one.from(Equipment)
                                         .where({ID:equipmentID})
        
    });

    
})
