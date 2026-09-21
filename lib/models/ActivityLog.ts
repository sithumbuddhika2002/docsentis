import mongoose, { Schema, Model } from "mongoose";
import { IActivityLog } from "@/types";

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    documentId: {
      type: Schema.Types.ObjectId as any,
      ref: "Document",
      index: true,
    },
    documentTitle: { type: String },
    userId: {
      type: Schema.Types.ObjectId as any,
      ref: "User",
      index: true,
    },
    userEmail: { type: String },
    action: {
      type: String,
      enum: [
        "DOCUMENT_UPLOADED",
        "DOCUMENT_VIEWED",
        "DOCUMENT_REPLACED",
        "DOCUMENT_DELETED",
        "DOCUMENT_DISABLED",
        "DOCUMENT_ENABLED",
        "PERMISSION_GRANTED",
        "PERMISSION_REVOKED",
        "PERMISSION_EXPIRED",
        "ACCESS_DENIED",
        "HEARTBEAT_ACKNOWLEDGED",
      ],
      required: true,
      index: true,
    },
    ipAddress: { type: String },
    userAgent: { type: String },
    details: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: false,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const ActivityLog: Model<IActivityLog> =
  mongoose.models.ActivityLog ||
  mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);
