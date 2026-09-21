import mongoose, { Schema, Model } from "mongoose";
import { IPermission } from "@/types";

const PermissionSchema = new Schema<IPermission>(
  {
    documentId: {
      type: Schema.Types.ObjectId as any,
      ref: "Document",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId as any,
      ref: "User",
      required: true,
      index: true,
    },
    grantedBy: {
      type: Schema.Types.ObjectId as any,
      ref: "User",
      required: true,
    },
    expiresAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["ACTIVE", "EXPIRING_SOON", "EXPIRED", "REVOKED"],
      default: "ACTIVE",
      required: true,
      index: true,
    },
    revokedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound index to quickly find permission for document + user
PermissionSchema.index({ documentId: 1, userId: 1 });

export const Permission: Model<IPermission> =
  mongoose.models.Permission || mongoose.model<IPermission>("Permission", PermissionSchema);
