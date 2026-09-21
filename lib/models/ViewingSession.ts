import mongoose, { Schema, Model } from "mongoose";
import { IViewingSession } from "@/types";

const ViewingSessionSchema = new Schema<IViewingSession>(
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
    sessionTokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    createdAt: { type: Date, default: Date.now, required: true },
    expiresAt: { type: Date, required: true, index: true },
    lastActivity: { type: Date, default: Date.now, required: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    status: {
      type: String,
      enum: ["ACTIVE", "EXPIRED", "REVOKED"],
      default: "ACTIVE",
      required: true,
      index: true,
    },
  },
  {
    timestamps: false,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id.toString();
        delete ret.sessionTokenHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const ViewingSession: Model<IViewingSession> =
  mongoose.models.ViewingSession ||
  mongoose.model<IViewingSession>("ViewingSession", ViewingSessionSchema);
