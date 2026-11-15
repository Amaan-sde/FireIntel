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
  Zap,
  Activity,
  Layers,
} from "lucide-react";

interface SupervisedModelStats {
  name: string;
  accuracy: number;
  balanced_accuracy: number;
  macro_precision: number;
  macro_recall: number;
  macro_f1: number;
}

interface ConfusionMatrix {
  labels: string[];
  matrix: number[][];
}

interface FeatureImportance {
  feature: string;
  importance_pct: number;
}

interface SpatialClusters {
  cluster_count: number;
  isolated_hotspots: number;
  largest_cluster_obs: number;
}

interface AnomalyDetection {
  method: string;
  anomalous_observations: number;
  anomaly_percentage: number;
}

interface ModelResult {
  status: string;
  model_type: "SUPERVISED_DUAL_CLASSIFIER" | "UNSUPERVISED_SPATIAL_ANOMALY" | string;
  target_variable?: string;
  classes?: string[];
  training_samples: number;
  test_samples?: number;
  features_used?: string[];
  models?: {
    random_forest: SupervisedModelStats;
    xgboost: SupervisedModelStats;
    baseline: {
      name: string;
      accuracy: number;
    };
  };
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
  const isSupervised = modelResult?.model_type === "SUPERVISED_DUAL_CLASSIFIER" || (modelResult?.models !== undefined);

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
              Machine Learning & Spatial Intelligence Laboratory
            </h3>
            <span className="text-[10px] text-slate-400">
              Dual Classifiers (Random Forest & XGBoost) + DBSCAN Clustering & Isolation Forest
            </span>
          </div>
        </div>

        {/* Mode Selector & Run Action */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center p-0.5 rounded-xl bg-black/60 border border-white/10 text-[11px]">
            <button
              onClick={() => onModeChange("auto")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                selectedMode === "auto"
                  ? "bg-purple-500/30 text-purple-200 border border-purple-500/40 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Auto-detects whether ground-truth class labels exist in uploaded dataset"
            >
              Auto Engine
            </button>
            <button
              onClick={() => onModeChange("supervised")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                selectedMode === "supervised"
                  ? "bg-purple-500/30 text-purple-200 border border-purple-500/40 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Supervised classification (requires target label e.g. type)"
            >
              Supervised (RF + XGB)
            </button>
            <button
              onClick={() => onModeChange("unsupervised")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                selectedMode === "unsupervised"
                  ? "bg-purple-500/30 text-purple-200 border border-purple-500/40 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Unsupervised DBSCAN Spatial Clustering & Isolation Forest Outlier Analysis"
            >
              Unsupervised (DBSCAN + IF)
            </button>
          </div>

          <button
            data-testid="execute-ml-btn"
            onClick={() => onTrain(selectedMode)}
            disabled={isTraining}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold transition-all shadow-lg hover:shadow-purple-500/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isTraining ? (
              <>
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>Training Models...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                <span>Execute ML Pipeline</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Target Status Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-black/40 border border-white/5">
        <div className="flex items-center gap-2 text-[11px]">
          {hasTargetLabel ? (
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Ground Truth Target Detected: <code className="text-white bg-white/10 px-1.5 py-0.5 rounded font-mono">{targetColName || "type"}</code> (Vegetation Fire vs Static Land Source)
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-400 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              Unlabelled Telemetry Stream (Common in NRT): Executing Unsupervised DBSCAN & Isolation Forest
            </span>
          )}
        </div>

        <div className="text-[10px] text-slate-500">
          Strict Scientific Rule: Coordinates (Lat/Lon) withheld from training features to prevent spatial memorization.
        </div>
      </div>

      {/* Results Workspace */}
      {modelResult && (
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* CASE A: SUPERVISED CLASSIFIER (RF + XGBOOST) */}
          {isSupervised && modelResult.models && (
            <div className="space-y-4">
              {/* Dual Model Performance Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Random Forest Card */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-950/40 to-black/60 border border-purple-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Primary Model</span>
                    <span className="px-2 py-0.5 rounded text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">Scikit-Learn</span>
                  </div>
                  <div className="text-sm font-bold text-white">Random Forest Classifier</div>
                  <div className="text-2xl font-black text-purple-300">
                    {modelResult.models.random_forest.accuracy}%
                    <span className="text-xs text-slate-400 font-normal ml-1">accuracy</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-300 pt-2 border-t border-white/10">
                    <div>Bal. Acc: <span className="font-bold text-white">{modelResult.models.random_forest.balanced_accuracy}%</span></div>
                    <div>Macro F1: <span className="font-bold text-white">{modelResult.models.random_forest.macro_f1}%</span></div>
                    <div>Precision: <span className="font-bold text-white">{modelResult.models.random_forest.macro_precision}%</span></div>
                    <div>Recall: <span className="font-bold text-white">{modelResult.models.random_forest.macro_recall}%</span></div>
                  </div>
                </div>

                {/* XGBoost Card */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-950/40 to-black/60 border border-cyan-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Secondary Model</span>
                    <span className="px-2 py-0.5 rounded text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">Gradient Boosted</span>
                  </div>
                  <div className="text-sm font-bold text-white">XGBoost Classifier</div>
                  <div className="text-2xl font-black text-cyan-300">
                    {modelResult.models.xgboost.accuracy}%
                    <span className="text-xs text-slate-400 font-normal ml-1">accuracy</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-300 pt-2 border-t border-white/10">
                    <div>Bal. Acc: <span className="font-bold text-white">{modelResult.models.xgboost.balanced_accuracy}%</span></div>
                    <div>Macro F1: <span className="font-bold text-white">{modelResult.models.xgboost.macro_f1}%</span></div>
                    <div>Precision: <span className="font-bold text-white">{modelResult.models.xgboost.macro_precision}%</span></div>
                    <div>Recall: <span className="font-bold text-white">{modelResult.models.xgboost.macro_recall}%</span></div>
                  </div>
                </div>

                {/* Baseline Comparison Card */}
                <div className="p-4 rounded-xl bg-black/50 border border-white/10 space-y-2 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Baseline Comparison</span>
                    <div className="text-sm font-bold text-slate-200">Majority Class Dummy</div>
                    <div className="text-2xl font-black text-slate-300 mt-1">
                      {modelResult.models.baseline.accuracy}%
                      <span className="text-xs text-slate-500 font-normal ml-1">naive prior</span>
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-300">
                    ✓ Both models exceed naive majority class guess by +{(modelResult.models.random_forest.accuracy - modelResult.models.baseline.accuracy).toFixed(1)}% to +{(modelResult.models.xgboost.accuracy - modelResult.models.baseline.accuracy).toFixed(1)}%.
                  </div>
                </div>
              </div>

              {/* Confusion Matrix & Feature Importances */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Confusion Matrix */}
                {modelResult.confusion_matrix && (
                  <div className="p-4 rounded-xl bg-black/50 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Grid className="w-3.5 h-3.5 text-purple-400" />
                        Confusion Matrix (Test Evaluation Set)
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-center text-xs font-mono">
                        <thead>
                          <tr className="text-slate-400 border-b border-white/10">
                            <th className="p-2 text-left text-[10px]">Actual \ Pred</th>
                            {modelResult.confusion_matrix.labels.map((lbl) => (
                              <th key={lbl} className="p-2 text-[10px]">Class {lbl}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {modelResult.confusion_matrix.matrix.map((row, i) => (
                            <tr key={i} className="border-b border-white/5">
                              <td className="p-2 text-left font-bold text-slate-300 text-[10px]">
                                Class {modelResult.confusion_matrix!.labels[i]}
                              </td>
                              {row.map((val, j) => (
                                <td
                                  key={j}
                                  className={`p-2 font-bold ${
                                    i === j
                                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded"
                                      : "text-slate-400"
                                  }`}
                                >
                                  {val}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Class 0: Presumed Vegetation Fire • Class 2: Static Land Heat Source (Industrial / Gas Flare)
                    </div>
                  </div>
                )}

                {/* Feature Importance */}
                {modelResult.feature_importance && (
                  <div className="p-4 rounded-xl bg-black/50 border border-white/10 space-y-3">
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
                      Radiometric Feature Importance
                    </span>
                    <div className="space-y-1.5">
                      {modelResult.feature_importance.map((f) => (
                        <div key={f.feature} className="space-y-0.5">
                          <div className="flex justify-between text-[10px] text-slate-300">
                            <span className="font-mono">{f.feature}</span>
                            <span className="font-bold text-cyan-300">{f.importance_pct}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
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
              </div>
            </div>
          )}

          {/* CASE B: UNSUPERVISED MACHINE LEARNING (DBSCAN + ISOLATION FOREST) */}
          {!isSupervised && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* DBSCAN Spatial Clustering */}
              <div className="p-4 rounded-xl bg-black/50 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    DBSCAN Spatial Cluster Identification
                  </span>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    eps ~ 8km, min_samples 4
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] text-slate-400 block">Fire Clusters</span>
                    <span className="text-lg font-black text-emerald-300">
                      {modelResult.spatial_clusters?.cluster_count || 0}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] text-slate-400 block">Largest Complex</span>
                    <span className="text-lg font-black text-cyan-300">
                      {modelResult.spatial_clusters?.largest_cluster_obs || 0}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] text-slate-400 block">Isolated Hotspots</span>
                    <span className="text-lg font-black text-slate-300">
                      {modelResult.spatial_clusters?.isolated_hotspots || 0}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Identifies multi-pixel contiguous fire perimeters and burning complexes across the geographic area.
                </p>
              </div>

              {/* Isolation Forest Radiometric Anomaly Detection */}
              <div className="p-4 rounded-xl bg-black/50 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    Isolation Forest Radiometric Anomalies
                  </span>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Contamination 5%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] text-slate-400 block">Extreme Outliers</span>
                    <span className="text-lg font-black text-rose-400">
                      {modelResult.anomaly_detection?.anomalous_observations || 0}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] text-slate-400 block">Anomaly Rate</span>
                    <span className="text-lg font-black text-white">
                      {modelResult.anomaly_detection?.anomaly_percentage || 0}%
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Isolates severe thermal signatures exhibiting extreme Fire Radiative Power (FRP) and 4µm brightness temperatures.
                </p>
              </div>
            </div>
          )}

          {/* Scientific Disclosure */}
          <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30 text-[10px] text-purple-200/90 leading-relaxed flex items-start gap-2.5">
            <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-purple-300 uppercase block mb-0.5">Scientific Governance Disclosure:</span>
              {modelResult.scientific_disclosure}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
