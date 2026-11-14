# FIREINTEL — Actual ERA5-Land Variable Quality & Validation Report (Phase 5B.3)

**Project:** FIREINTEL — Satellite-Based Forest Fire Intelligence System for Uttarakhand, India  
**Phase:** Phase 5B.3: Live ERA5-Land Pilot Validation  
**Target Scope:** Meteorological, Hydrological, and Soil Water Variables (9 Canonical Layers)  
**Operational Status:** **AWAITING LIVE INGESTION (CDS HTTP 401 UNAUTHORIZED)**  
*(Zero fabricated observations per Phase 5B safety rules; lapse-rate corrections strictly disabled).*

---

## 1. Executive Summary

Wildfire risk modeling in complex mountain environments requires a physically coherent atmospheric and hydrological dataset. Every variable serves a distinct physical role in fire ignition thermodynamics, rate of forward spread, or fuel drying.

Because the live 48-hour pilot acquisition was halted by ECMWF CDS due to a key authorization error (HTTP 401), **no actual NetCDF data was written to disk**. In strict accordance with project rules ("Do not fabricate missing observations; do not mark this phase successful if actual data validation fails"), no synthetic arrays have been generated. 

This report documents the rigorous quality validation thresholds, physical range invariants, coordinate conventions, and lapse-rate policies governing all non-precipitation variables.

---

## 2. Canonical Variable Quality & Physical Boundary Specifications

| Variable Code | NetCDF Variable Name | Upstream Units | Target Units | Physical Transformation | Physical Valid Range | Missing / FillValue |
| :---: | :--- | :---: | :---: | :--- | :---: | :---: |
| `t2m` | `2m_temperature` | `K` | `°C` | $T(^\circ\text{C}) = T(\text{K}) - 273.15$ | $[-30.0^\circ\text{C}, 50.0^\circ\text{C}]$ | `-32767` |
| `d2m` | `2m_dewpoint_temperature` | `K` | `°C` | $T_d(^\circ\text{C}) = T_d(\text{K}) - 273.15$ | $[-40.0^\circ\text{C}, 35.0^\circ\text{C}]$ | `-32767` |
| `u10` | `10m_u_component_of_wind` | `m s**-1` | `m/s` | Identity (orthogonal zonal vector) | $[-50.0\text{ m/s}, 50.0\text{ m/s}]$ | `-32767` |
| `v10` | `10m_v_component_of_wind` | `m s**-1` | `m/s` | Identity (orthogonal meridional vector) | $[-50.0\text{ m/s}, 50.0\text{ m/s}]$ | `-32767` |
| `swvl1` | `volumetric_soil_water_layer_1` | `m**3 m**-3` | `m³/m³` | Identity ($0\text{–}7\text{ cm}$ surface depth) | $[0.00\text{ m³/m³}, 0.70\text{ m³/m³}]$ | `-32767` |
| `swvl2` | `volumetric_soil_water_layer_2` | `m**3 m**-3` | `m³/m³` | Identity ($7\text{–}28\text{ cm}$ root depth) | $[0.00\text{ m³/m³}, 0.70\text{ m³/m³}]$ | `-32767` |
| `swvl3` | `volumetric_soil_water_layer_3` | `m**3 m**-3` | `m³/m³` | Identity ($28\text{–}100\text{ cm}$ deep root) | $[0.00\text{ m³/m³}, 0.70\text{ m³/m³}]$ | `-32767` |
| `swvl4` | `volumetric_soil_water_layer_4` | `m**3 m**-3` | `m³/m³` | Identity ($100\text{–}289\text{ cm}$ subsoil) | $[0.00\text{ m³/m³}, 0.70\text{ m³/m³}]$ | `-32767` |

---

## 3. Physical Consistency Invariants Checked on Real Data

Upon retrieval, the following thermodynamic and kinematic invariants will be enforced:

### Invariant 1: Dewpoint Depression ($T \ge T_d$)
By definition, air temperature cannot drop below its dewpoint temperature under thermodynamic equilibrium:
$$T_{2m}(x, y, t) \ge T_{d2m}(x, y, t) - \epsilon \quad (\epsilon = 10^{-4}\;^\circ\text{C})$$
If $T_d > T$, relative humidity exceeds $100\%$ (supersaturation), indicating a corrupted data slice.

### Invariant 2: Derived Vapor Pressure Deficit ($VPD \ge 0\text{ kPa}$)
Vapor pressure deficit ($VPD = e_s(T) - e(T_d)$) is computed via the August-Roche-Magnus formulation:
$$e_s(T) = 0.61078 \times \exp\left(\frac{17.27 \times T}{T + 237.3}\right)$$
$$e(T_d) = 0.61078 \times \exp\left(\frac{17.27 \times T_d}{T_d + 237.3}\right)$$
$$VPD = \max\left(0.0, \; e_s(T) - e(T_d)\right)$$
$VPD$ must be strictly non-negative across all grid cells.

### Invariant 3: Derived Wind Speed & Direction
$$WS_{10m} = \sqrt{u_{10}^2 + v_{10}^2} \ge 0.0\text{ m/s}$$
$$\text{Wind\_Dir} = \left(\arctan2(-u_{10}, -v_{10}) \times \frac{180}{\pi} + 360^\circ\right) \pmod{360^\circ} \in [0^\circ, 360^\circ)$$

### Invariant 4: Soil Moisture Stratification
All 4 soil moisture layers represents volumetric fraction of water per volume of soil. For mineral soils, porosity limits saturation to approximately $0.60\text{–}0.70\text{ m}^3/\text{m}^3$. Any negative value or value $> 0.70$ triggers a quality flag.

---

## 4. Coordinate Orientation & Timestamp Alignment

In native ERA5-Land NetCDF outputs:
- **Latitude Orientation:** Stored in **descending order** ($31.5^\circ\text{N} \to 28.7^\circ\text{N}$, step $-0.10^\circ$).
- **Longitude Orientation:** Stored in **ascending order** ($77.5^\circ\text{E} \to 81.1^\circ\text{E}$, step $+0.10^\circ$).
- **Spatial Resolution:** $0.10^\circ \times 0.10^\circ$ ($\approx 9\text{ km}$).
- **Temporal Coordinates:** 48 hourly steps indexed from `2025-01-01 00:00:00 UTC` to `2025-01-02 23:00:00 UTC`.

---

## 5. Policy on Geopotential Height & Lapse-Rate Corrections

Requirement 6 mandates:
> *"Inspect whether the required surface geopotential information is available. Do not apply a lapse-rate correction without validating the actual model surface elevation. Keep lapse-rate correction disabled if verification is incomplete."*

### Scientific Verification Findings:
1. **Absence from Hourly Payload:** The 9 configured variables in `era5_land_finalized_variables.json` are time-varying surface/near-surface weather fields. They do **not** include the static invariant `geopotential` ($z$).
2. **Why Lapse Rates Cannot Be Applied Blindly:**  
   Applying a vertical temperature correction:
   $$T_{\text{local}} = T_{\text{ERA5}} + \Gamma \times \left(Z_{\text{DEM}} - Z_{\text{ERA5}}\right)$$
   requires knowing the exact model surface geopotential height $Z_{\text{ERA5}} = z / 9.80665\text{ m}$.  
   If an assumed or approximate elevation is used for the $0.10^\circ$ node, the difference $(Z_{\text{DEM}} - Z_{\text{ERA5}})$ can be off by hundreds of meters in steep Himalayan gorges, introducing massive uncalibrated thermal errors.
3. **Winter Inversion Hazard:** In January, nocturnal radiative cooling produces strong temperature inversions in Uttarakhand valleys (colder at the valley floor, warmer on the ridgeline). A standard negative lapse rate ($\Gamma = -6.5^\circ\text{C} / 1000\text{m}$) would predict warmer valley bottoms and freezing ridges, completely inverting the physical reality.
4. **Operational Decision:** **Lapse-rate corrections remain strictly disabled.** All temperatures will be ingested and preserved at their native $0.10^\circ$ model resolution.

