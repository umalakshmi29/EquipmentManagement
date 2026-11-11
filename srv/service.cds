using {em} from '../db/schema';
service EquipmentManagement{
    entity Equipment as projection on em.Equipment;
    entity EquipmentLocation as projection on em.EquipmentLocation;
    entity MaintenancePlan as projection on em.MaintenancePlan;
    entity MaintenanceRequest as projection on em.MaintenanceRequest;
    entity WorkOrder as projection on em.WorkOrder;
    entity WorkOrderperation as projection on em.WorkOrderOperation;
    entity Technician as projection on em.Technician;
    entity TechnicianAssignment as projection on em.TechnicianAssignment;
    entity SparePart as projection on em.SparePart;
    entity PartConsumption as projection on em.PartConsumption;
    entity DowntimeEvent as projection on em.DowntimeEvent;
    entity TimeConfirmation as projection on em.TimeConfirmation;
}