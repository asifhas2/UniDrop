import * as transferService from '../services/transferService.js';
import { initTransferSchema, updateTransferStatusSchema } from '../validators/transferValidator.js';

export const initTransfer = async (req, res, next) => {
  try {
    const validated = initTransferSchema.parse(req.body);
    const transfer = await transferService.initTransfer({
      ...validated,
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      data: transfer,
    });
  } catch (err) {
    next(err);
  }
};

export const updateTransfer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const validated = updateTransferStatusSchema.parse(req.body);
    const transfer = await transferService.updateTransferProgress({
      transferId: id,
      ...validated,
    });

    if (!transfer) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Transfer record not found.' },
      });
    }

    res.status(200).json({
      success: true,
      data: transfer,
    });
  } catch (err) {
    next(err);
  }
};

export const getTransfer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const transfer = await transferService.getTransferById(id);

    if (!transfer) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Transfer record not found.' },
      });
    }

    res.status(200).json({
      success: true,
      data: transfer,
    });
  } catch (err) {
    next(err);
  }
};

export const uploadRelay = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'No file uploaded in form data.' },
      });
    }

    const { sessionId, senderDeviceId, receiverDeviceId } = req.body;
    if (!sessionId || !senderDeviceId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'sessionId and senderDeviceId are required.' },
      });
    }

    const transfer = await transferService.initTransfer({
      sessionId,
      fileName: req.cleanFileName || req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      senderDeviceId,
      receiverDeviceId,
      transferMode: 'server_relay',
      tempFilePath: req.file.path,
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      data: {
        transferId: transfer.transferId,
        fileName: transfer.fileName,
        fileSize: transfer.fileSize,
        downloadUrl: `/api/transfers/${transfer.transferId}/download`,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const downloadRelay = async (req, res, next) => {
  try {
    const { id } = req.params;
    await transferService.handleRelayDownload({
      transferId: id,
      res,
      ip: req.ip,
    });
  } catch (err) {
    next(err);
  }
};
