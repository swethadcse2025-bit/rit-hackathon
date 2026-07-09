"use client";

import React from "react";
import { Lock, ShieldCheck, Database, Calendar, Tag, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";

interface BlockchainVerifierProps {
  passportId: string;
  blockchainData: {
    verificationStatus: string;
    blocksCount: number;
    ledger: {
      blockId: string;
      consentHash: string;
      predictionHash: string;
      doctorReviewHash: string;
      modelVersion: string;
      timestamp: string;
    }[];
  } | null;
}

export function BlockchainVerifier({ passportId, blockchainData }: BlockchainVerifierProps) {
  if (!blockchainData || blockchainData.ledger.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center border border-dashed rounded-xl p-8 bg-muted/20">
        <div className="text-center">
          <Database className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No cryptographic blocks verified on this passport yet.</p>
        </div>
      </div>
    );
  }

  const truncateHash = (hash: string) => {
    if (!hash) return "N/A";
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-5 w-5 text-success" />
            Blockchain Consent & Review Ledger
          </CardTitle>
          <CardDescription>
            Cryptographic trust anchors verifying consent and version immutability
          </CardDescription>
        </div>
        <Badge variant="success" className="gap-1">
          <Lock className="h-3 w-3" /> Integrity: {blockchainData.verificationStatus}
        </Badge>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg border">
            <span>Passport Hash Ref: {passportId}</span>
            <span>Total Blocks: {blockchainData.blocksCount}</span>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {blockchainData.ledger.map((block) => (
              <div
                key={block.blockId}
                className="bg-card p-4 rounded-lg border border-border/70 hover:border-success/30 shadow-sm transition-colors text-xs space-y-3"
              >
                <div className="flex justify-between items-center pb-2 border-b border-border/30">
                  <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5 text-primary" /> Block #{block.blockId.slice(0, 6)}
                  </span>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(block.timestamp).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-[10px]">
                  <div className="bg-muted/40 p-2 rounded border space-y-1">
                    <span className="text-slate-500 font-semibold block uppercase">Consent Hash</span>
                    <span className="text-slate-800 dark:text-slate-200 truncate block" title={block.consentHash}>
                      {truncateHash(block.consentHash)}
                    </span>
                  </div>
                  <div className="bg-muted/40 p-2 rounded border space-y-1">
                    <span className="text-slate-500 font-semibold block uppercase">Prediction Hash</span>
                    <span className="text-slate-800 dark:text-slate-200 truncate block" title={block.predictionHash}>
                      {truncateHash(block.predictionHash)}
                    </span>
                  </div>
                  <div className="bg-muted/40 p-2 rounded border space-y-1">
                    <span className="text-slate-500 font-semibold block uppercase">Doctor Review Hash</span>
                    <span className="text-slate-800 dark:text-slate-200 truncate block" title={block.doctorReviewHash}>
                      {truncateHash(block.doctorReviewHash)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5" /> Model Version: {block.modelVersion}
                  </span>
                  <span className="text-[10px] text-success font-semibold flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" /> Verified Immutable
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
