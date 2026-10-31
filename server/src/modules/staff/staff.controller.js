import * as staffService from './staff.service.js';

export async function createStaff(req, res, next) {
  try {
    const staff = await staffService.createStaffMember(req.body);
    res.status(201).json({
      message: 'Staff member created successfully',
      data: staff,
    });
  } catch (error) {
    next(error);
  }
}

export async function getStaff(req, res, next) {
  try {
    const staff = await staffService.listStaffMembers();
    res.status(200).json({
      data: staff,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteStaff(req, res, next) {
  try {
    const result = await staffService.deleteStaffMember(req.params.id, req.user?.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

