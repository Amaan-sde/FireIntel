"use client";

import React from "react";
import {
  Cpu,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Flame,
  CheckCircle2,
  TrendingUp,
  BarChart2,
  Info,
  Grid,
} from "lucide-react";

interface SupervisedMetrics {
  accuracy: number;
  balanced_accuracy: number;
  baseline_majority_accuracy: number;
  macro_precision: number;
  macro_recall: number;
  macro_f1: number;
}

interface FeatureImportance {
  feature: string;
  importance_pct: number;
}

interface ConfusionMatrix {
  labels: string[];
  matrix: number[][];
}

interface SpatialClusters {
  cluster_count: number;
  isolated_hotspots: number;
  largest_cluster_obs: number;
}

interface AnomalyDetection {
  method: string;
  features: string[];
  anomalous_observations: number;
  anomaly_percentage: number;
}

interface ModelResult {
  status: string;
  model_type: "SUPERVISED_CLASSIFIER" | "UNSUPERVISED_SPATIAL_ANOMALY";
  model_name: string;
  training_samples: number;
  test_samples?: number;
  features_used_count?: number;
  metrics?: SupervisedMetrics;
  confusion_matrix?: ConfusionMatrix;
  feature_importance?: FeatureImportance[];
  spatial_clusters?: SpatialClusters;
  anomaly_detection?: AnomalyDetection;
  scientific_disclosure: string;
}

interface StudioModelLabProps {
  modelResult: ModelResult | null;
  isTraining: boolean;
  onTrain: (mode: "auto" | "supervised" | "unsupervised") => void;
  selectedMode: "auto" | "supervised" | "unsupervised";
  onModeChange: (mode: "auto" | "supervised" | "unsupervised") => void;
  hasTargetLabel: boolean;
  targetColName?: string;
}

export default function StudioModelLab({
  modelResult,
  isTraining,
  onTrain,
  selectedMode,
  onModeChange,
  hasTargetLabel,
  targetColName,
}: StudioModelLabProps) {
  return (
    <div className="bg-[#030612]/90 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-2xl space-y-5 font-mono-telemetry text-xs">
      {/* Header & Mode Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">
              Automated Machine Learning & Analytics Laboratory
            </h3>
            <span className="text-[10px] text-slate-400">
              Scikit-Learn Random Forest Classification & Unsupervised Spatial Intelligence
            </span>
          </div>
        </div>

        {/* Pipeline Mode Controls & Execution Trigger */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center p-0.5 rounded-xl bg-black/70 border border-white/10 text-[11px]">
            <button
              onClick={() => onModeChange("auto")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                selectedMode === "auto"
                  ? "bg-purple-500/30 text-purple-300 font-bold border border-purple-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Auto-Detect
            </button>
            <button
              onClick={() => onModeChange("supervised")}
              disabled={!hasTargetLabel}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                selectedMode === "supervised"
                  ? "bg-purple-500/30 text-purple-300 font-bold border border-purple-500/40"
                  : hasTargetLabel
                  ? "text-slate-400 hover:text-white"
                  : "text-slate-600 cursor-not-allowed"
              }`}
              title={!hasTargetLabel ? "Requires a target column in dataset mapping" : ""}
            >
              Supervised Classifier
            </button>
            <button
              onClick={() => onModeChange("unsupervised")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                selectedMode === "unsupervised"
                  ? "bg-purple-500/30 text-purple-300 font-bold border border-purple-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Spatial & Anomaly
            </button>
          </div>

          <button
            data-testid="execute-train-btn"
            onClick={() => onTrain(selectedMode)}
            disabled={isTraining}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg cursor-pointer transition-all disabled:opacity-50"
          >
            {isTraining ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Training Pipeline...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                <span>Execute ML Pipeline</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Model Results Body */}
      {modelResult ? (
        <div className="space-y-5">
          {/* Top Model Info Badge */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                {modelResult.model_type}
              </span>
              <strong className="text-white text-xs">{modelResult.model_name}</strong>
            </div>
            <span className="text-[10px] text-slate-400">
              Evaluated on {modelResult.training_samples.toLocaleString()} samples
              {modelResult.test_samples ? ` (${modelResult.test_samples.toLocaleString()} test holdout)` : ""}
            </span>
          </div>

          {/* CASE A: SUPERVISED EVALUATION DASHBOARD */}
          {modelResult.model_type === "SUPERVISED_CLASSIFIER" && modelResult.metrics && (
            <div className="space-y-4">
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1">
                  <span className="text-[10px] text-slate-400 block uppercase">Overall Accuracy</span>
                  <div className="text-2xl font-black text-white">{modelResult.metrics.accuracy}%</div>
                  <span className="text-[9px] text-slate-500 block">
                    vs {modelResult.metrics.baseline_majority_accuracy}% naive baseline
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-black/40 border border-cyan-500/30 space-y-1">
                  <span className="text-[10px] text-cyan-400 block uppercase font-bold">Balanced Accuracy</span>
                  <div className="text-2xl font-black text-cyan-300">{modelResult.metrics.balanced_accuracy}%</div>
                  <span className="text-[9px] text-cyan-400/80 block">Honest unweighted mean</span>
                </div>

                <div className="p-3.5 rounded-xl bg-black/40 border border-purple-500/30 space-y-1">
                  <span className="text-[10px] text-purple-400 block uppercase font-bold">Macro F1-Score</span>
                  <div className="text-2xl font-black text-purple-300">{modelResult.metrics.macro_f1}%</div>
                  <span className="text-[9px] text-purple-400/80 block">Harmonic mean</span>
                </div>

                <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1">
                  <span className="text-[10px] text-slate-400 block uppercase">Macro Precision / Recall</span>
                  <div className="text-lg font-bold text-slate-200">
                    {modelResult.metrics.macro_precision}% / {modelResult.metrics.macro_recall}%
                  </div>
                  <span className="text-[9px] text-slate-500 block">Multi-class balance</span>
                </div>
              </div>

              {/* 2-Column Evaluation: Feature Importance & Confusion Matrix */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Feature Importance */}
                {modelResult.feature_importance && (
                  <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-3">
                    <div className="flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-purple-400" />
                      <strong className="text-xs text-white uppercase">Feature Importance Hierarchy</strong>
                    </div>
                    <div className="space-y-2">
                      {modelResult.feature_importance.map((f, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-300">{f.feature}</span>
                            <span className="text-purple-300 font-bold">{f.importance_pct}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full"
                              style={{ width: `${Math.min(100, f.importance_pct * 2.5)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confusion Matrix */}
                {modelResult.confusion_matrix && (
                  <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-3">
                    <div className="flex items-center gap-2">
                      <Grid className="w-4 h-4 text-cyan-400" />
                      <strong className="text-xs text-white uppercase">Confusion Matrix Heatmap</strong>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-center text-xs">
                        <thead>
                          <tr>
                            <th className="p-2 text-slate-500 text-[10px]">True \ Pred</th>
                            {modelResult.confusion_matrix.labels.map((lbl) => (
                              <th key={lbl} className="p-2 text-cyan-400 font-bold text-[10px]">
                                Class {lbl}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {modelResult.confusion_matrix.matrix.map((row, rIdx) => (
                            <tr key={rIdx} className="border-t border-white/5">
                              <td className="p-2 text-slate-400 font-bold text-[10px]">
                                Class {modelResult.confusion_matrix!.labels[rIdx]}
                              </td>
                              {row.map((cell, cIdx) => (
                                <td
                                  key={cIdx}
                                  className={`p-2 font-bold ${
                                    rIdx === cIdx
                                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                      : cell > 0
                                      ? "bg-rose-500/10 text-rose-300"
                                      : "text-slate-600"
                                  }`}
                                >
                                  {cell.toLocaleString()}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CASE B: UNSUPERVISED EVALUATION DASHBOARD */}
          {modelResult.model_type === "UNSUPERVISED_SPATIAL_ANOMALY" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* DBSCAN Spatial Clusters */}
              {modelResult.spatial_clusters && (
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/10 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <Sparkles className="w-4 h-4" />
                    <span className="uppercase">DBSCAN Spatial Hotspot Clusters</span>
                  </div>
                  <div className="space-y-2 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Coherent Fire Clusters:</span>
                      <span className="text-white font-bold">{modelResult.spatial_clusters.cluster_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Largest Cluster Size:</span>
                      <span className="text-emerald-300 font-bold">
                        {modelResult.spatial_clusters.largest_cluster_obs.toLocaleString()} obs
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Isolated Outliers:</span>
                      <span className="text-slate-300 font-bold">
                        {modelResult.spatial_clusters.isolated_hotspots.toLocaleString()} obs
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Isolation Forest Radiometric Anomalies */}
              {modelResult.anomaly_detection && (
                <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/10 space-y-3">
                  <div className="flex items-center gap-2 text-rose-400 font-bold">
                    <Flame className="w-4 h-4" />
                    <span className="uppercase">Isolation Forest Anomaly Scoring</span>
                  </div>
                  <div className="space-y-2 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Radiometric Anomalies:</span>
                      <span className="text-rose-300 font-bold">
                        {modelResult.anomaly_detection.anomalous_observations.toLocaleString()} obs
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Anomaly Contamination:</span>
                      <span className="text-rose-400 font-bold">
                        {modelResult.anomaly_detection.anomaly_percentage}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Detection Method:</span>
                      <span className="text-slate-300">
                        {modelResult.anomaly_detection.method}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Scientific Governance Disclosure */}
          <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-950/20 space-y-1">
            <div className="flex items-center gap-1.5 text-purple-300 font-bold text-[11px]">
              <ShieldCheck className="w-4 h-4" />
              <span>Scientific Disclosure & Model Boundaries</span>
            </div>
            <p className="text-[10px] text-slate-300 leading-relaxed">
              {modelResult.scientific_disclosure}
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-slate-400 space-y-2">
          <Cpu className="w-8 h-8 mx-auto text-slate-600" />
          <p>Ready to execute automated machine learning across the uploaded observations.</p>
          <span className="text-[10px] text-slate-500 block">
            Click &apos;Execute ML Pipeline&apos; to run Scikit-Learn Random Forest or Spatial Clustering.
          </span>
        </div>
      )}
    </div>
  );
}

