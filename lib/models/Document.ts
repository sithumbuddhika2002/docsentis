import mongoose, { Schema, Model } from "mongoose";
import { IDocument } from "@/types";

const DocumentSchema = new Schema<IDocument>(
  {
    ownerId: {
      type: Schema.Types.ObjectId as any,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    storageKey: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true, default: "application/pdf" },
    pageCount: { type: Number, required: true, default: 1 },
    status: {
      type: String,
      enum: ["ACTIVE", "DISABLED", "DELETED"],
      default: "ACTIVE",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id.toString();
        // Do not expose storageKey to client representations
        delete ret.storageKey;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Document: Model<IDocument> =
  mongoose.models.Document || mongoose.model<IDocument>("Document", DocumentSchema);
