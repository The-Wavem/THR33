import React, { useState, useMemo, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import { Compass, MapPin, Package, Truck, Layers } from 'lucide-react';
import styles from './BrazilHeatmap.module.css';

// URL do arquivo GeoJSON oficial com as fronteiras reais dos 26 estados + DF
const BRAZIL_GEO_URL = '/brazil-states.json';

// Coordenadas geográficas dos centroides (Longitude, Latitude) para marcadores e hotzones
const STATE_CENTROIDS = {
  AC: [-70.5, -9.3],
  AL: [-36.6, -9.5],
  AM: [-64.7, -4.2],
  AP: [-52.0, 1.4],
  BA: [-41.7, -12.5],
  CE: [-39.6, -5.1],
  DF: [-47.8, -15.8],
  ES: [-40.7, -19.6],
  GO: [-49.6, -16.0],
  MA: [-45.3, -5.1],
  MG: [-44.7, -18.4],
  MS: [-54.8, -20.3],
  MT: [-55.9, -12.9],
  PA: [-53.1, -4.0],
  PB: [-36.8, -7.1],
  PE: [-38.0, -8.3],
  PI: [-43.0, -7.4],
  PR: [-51.6, -24.6],
  RJ: [-42.7, -22.2],
  RN: [-36.7, -5.8],
  RO: [-62.8, -10.9],
  RR: [-61.4, 2.1],
  RS: [-53.3, -29.7],
  SC: [-50.5, -27.2],
  SE: [-37.4, -10.6],
  SP: [-48.7, -22.3],
  TO: [-48.3, -10.1],
};

// Estados costeiros/compactos onde a sigla estática só aparece quando há envios ou em hover para evitar sobreposição
const COMPACT_COASTAL_UFS = new Set(['RN', 'PB', 'AL', 'SE', 'DF']);

// Metadados dos Estados Brasileiros, Macrorregiões e prioridade logística para desempate quando zerado
const BRAZIL_STATES_META = {
  SP: { name: 'São Paulo', region: 'Sudeste', hubPriority: 1 },
  PR: { name: 'Paraná', region: 'Sul', hubPriority: 2 },
  RJ: { name: 'Rio de Janeiro', region: 'Sudeste', hubPriority: 3 },
  MG: { name: 'Minas Gerais', region: 'Sudeste', hubPriority: 4 },
  SC: { name: 'Santa Catarina', region: 'Sul', hubPriority: 5 },
  RS: { name: 'Rio Grande do Sul', region: 'Sul', hubPriority: 6 },
  DF: { name: 'Distrito Federal', region: 'Centro-Oeste', hubPriority: 7 },
  BA: { name: 'Bahia', region: 'Nordeste', hubPriority: 8 },
  GO: { name: 'Goiás', region: 'Centro-Oeste', hubPriority: 9 },
  ES: { name: 'Espírito Santo', region: 'Sudeste', hubPriority: 10 },
  PE: { name: 'Pernambuco', region: 'Nordeste', hubPriority: 11 },
  CE: { name: 'Ceará', region: 'Nordeste', hubPriority: 12 },
  MS: { name: 'Mato Grosso do Sul', region: 'Centro-Oeste', hubPriority: 13 },
  MT: { name: 'Mato Grosso', region: 'Centro-Oeste', hubPriority: 14 },
  PA: { name: 'Pará', region: 'Norte', hubPriority: 15 },
  AM: { name: 'Amazonas', region: 'Norte', hubPriority: 16 },
  RN: { name: 'Rio Grande do Norte', region: 'Nordeste', hubPriority: 17 },
  PB: { name: 'Paraíba', region: 'Nordeste', hubPriority: 18 },
  MA: { name: 'Maranhão', region: 'Nordeste', hubPriority: 19 },
  AL: { name: 'Alagoas', region: 'Nordeste', hubPriority: 20 },
  SE: { name: 'Sergipe', region: 'Nordeste', hubPriority: 21 },
  PI: { name: 'Piauí', region: 'Nordeste', hubPriority: 22 },
  TO: { name: 'Tocantins', region: 'Norte', hubPriority: 23 },
  RO: { name: 'Rondônia', region: 'Norte', hubPriority: 24 },
  AC: { name: 'Acre', region: 'Norte', hubPriority: 25 },
  AP: { name: 'Amapá', region: 'Norte', hubPriority: 26 },
  RR: { name: 'Roraima', region: 'Norte', hubPriority: 27 },
};

const REGION_COLORS = {
  Sudeste: '#4ade80',
  Sul: '#60a5fa',
  'Centro-Oeste': '#facc15',
  Nordeste: '#f87171',
  Norte: '#a78bfa',
};

export function BrazilHeatmap({
  stateData = [],
  regionData = [],
  totalOrders = 0,
  totalPieces = 0,
  totalRevenue = 0,
}) {
  // Mapa de métricas logísticas por UF a partir dos endereços reais dos pedidos
  const stateMetricsMap = useMemo(() => {
    const map = {};
    if (Array.isArray(stateData)) {
      stateData.forEach((st) => {
        const uf = String(st.uf || st.estado || '').toUpperCase().trim();
        if (uf && BRAZIL_STATES_META[uf]) {
          map[uf] = {
            pedidos: Number(st.pedidos || 0),
            pecas: Number(st.pecas || st.pedidos || 0),
            receita: Number(st.receita || 0),
            regiao: st.regiao || BRAZIL_STATES_META[uf]?.region || 'Sudeste',
            cidades: Array.isArray(st.cidades) ? st.cidades : [],
          };
        }
      });
    }
    return map;
  }, [stateData]);

  // Quantidade de estados atendidos com pelo menos 1 envio no período
  const activeStatesCount = useMemo(() => {
    return Object.values(stateMetricsMap).filter((s) => s.pedidos > 0).length;
  }, [stateMetricsMap]);

  // Volume máximo de pedidos para cálculo da escala de calor
  const maxOrders = useMemo(() => {
    let max = 0;
    Object.values(stateMetricsMap).forEach((s) => {
      if (s.pedidos > max) max = s.pedidos;
    });
    return Math.max(max, 1);
  }, [stateMetricsMap]);

  // Escala linear D3 para o mapa coroplético (gradiente esmeralda/neon)
  const colorScale = useMemo(() => {
    return scaleLinear()
      .domain([1, Math.max(maxOrders, 2)])
      .range(['#134e35', '#22c55e']);
  }, [maxOrders]);

  // Ranking ordenado dos 5 maiores polos de envio de roupas
  const topRanking = useMemo(() => {
    return Object.entries(BRAZIL_STATES_META)
      .map(([uf, meta]) => {
        const m = stateMetricsMap[uf] || {
          pedidos: 0,
          pecas: 0,
          receita: 0,
          cidades: [],
        };
        return {
          uf,
          name: meta.name,
          region: meta.region,
          hubPriority: meta.hubPriority,
          pedidos: m.pedidos,
          pecas: m.pecas,
          receita: m.receita,
          cidades: m.cidades,
        };
      })
      .sort(
        (a, b) =>
          b.pedidos - a.pedidos ||
          b.pecas - a.pecas ||
          b.receita - a.receita ||
          a.hubPriority - b.hubPriority
      )
      .slice(0, 5);
  }, [stateMetricsMap]);

  // Estado interativo compartilhado entre o mapa e o painel de Raio-X
  const [hoveredUf, setHoveredUf] = useState(null);
  const [selectedUf, setSelectedUf] = useState('SP');

  // Sincroniza o estado inicial selecionado com o Estado líder em envios reais
  useEffect(() => {
    if (topRanking.length > 0 && topRanking[0].pedidos > 0) {
      setSelectedUf(topRanking[0].uf);
    }
  }, [topRanking]);

  // Estado atualmente exibido no Raio-X Territorial
  const activeState = useMemo(() => {
    const targetUf = hoveredUf || selectedUf || 'SP';
    const meta = BRAZIL_STATES_META[targetUf] || BRAZIL_STATES_META['SP'];
    const metrics = stateMetricsMap[targetUf] || {
      pedidos: 0,
      pecas: 0,
      receita: 0,
      regiao: meta.region,
      cidades: [],
    };
    const revenuePct =
      totalRevenue > 0 ? ((metrics.receita / totalRevenue) * 100).toFixed(1) : '0.0';
    const ordersPct =
      totalOrders > 0 ? ((metrics.pedidos / totalOrders) * 100).toFixed(1) : '0.0';

    return {
      uf: targetUf,
      name: meta.name,
      region: meta.region,
      pedidos: metrics.pedidos,
      pecas: metrics.pecas,
      receita: metrics.receita,
      cidades: metrics.cidades || [],
      revenuePct,
      ordersPct,
    };
  }, [hoveredUf, selectedUf, stateMetricsMap, totalRevenue, totalOrders]);

  // Total de peças enviadas (usa prop ou soma dos estados)
  const effectiveTotalPieces = useMemo(() => {
    if (totalPieces > 0) return totalPieces;
    return Object.values(stateMetricsMap).reduce((acc, s) => acc + (s.pecas || 0), 0);
  }, [totalPieces, stateMetricsMap]);

  return (
    <div className={styles.heatmapContainer}>
      {/* COLUNA ESQUERDA: MAPA COROPLÉTICO DO BRASIL (DESTINOS DE ENVIO) */}
      <div className={styles.mapWrapper}>
        <div className={styles.mapTopBar}>

          <div className={styles.mapSummaryPills}>
            <span className={styles.mapSummaryPill}>
              <strong>{activeStatesCount}</strong> {activeStatesCount === 1 ? 'UF atendida' : 'UFs atendidas'}
            </span>
            <span className={styles.mapSummaryPillAccent}>
              <strong>{effectiveTotalPieces}</strong> {effectiveTotalPieces === 1 ? 'peça enviada' : 'peças enviadas'}
            </span>
          </div>
        </div>

        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 775,
            center: [-54, -15],
          }}
          width={600}
          height={580}
          className={styles.mapSvg}
        >
          <Geographies geography={BRAZIL_GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const uf = String(
                  geo.properties?.sigla ||
                    geo.properties?.UF ||
                    geo.properties?.sigla_uf ||
                    geo.id ||
                    ''
                ).toUpperCase();

                const metrics = stateMetricsMap[uf] || { pedidos: 0, pecas: 0, receita: 0 };
                const hasOrders = metrics.pedidos > 0;
                const isLeader = hasOrders && metrics.pedidos === maxOrders;
                const isHovered = hoveredUf === uf;
                const isSelected = activeState.uf === uf;

                // Preenchimento do estado conforme volume de envios
                let fillColor = '#16161a';
                if (hasOrders) {
                  fillColor = isLeader ? '#22c55e' : colorScale(metrics.pedidos);
                }
                if (isHovered) {
                  fillColor = hasOrders ? '#4ade80' : '#27272e';
                } else if (isSelected && !hasOrders) {
                  fillColor = '#222228';
                }

                const strokeColor =
                  isHovered || isSelected
                    ? '#4ade80'
                    : hasOrders
                      ? 'rgba(74, 222, 128, 0.55)'
                      : 'rgba(255, 255, 255, 0.16)';

                const strokeWidth = isHovered || isSelected ? 1.75 : hasOrders ? 1.15 : 0.7;

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    style={{
                      default: {
                        outline: 'none',
                        transition: 'all 0.22s ease',
                        cursor: 'pointer',
                        filter: hasOrders
                          ? 'drop-shadow(0 0 8px rgba(34, 197, 94, 0.28))'
                          : 'none',
                      },
                      hover: {
                        outline: 'none',
                        fill: hasOrders ? '#4ade80' : '#2a2a32',
                        cursor: 'pointer',
                        filter: 'drop-shadow(0 0 10px rgba(74, 222, 128, 0.55))',
                      },
                      pressed: {
                        outline: 'none',
                      },
                    }}
                    onMouseEnter={() => setHoveredUf(uf)}
                    onMouseLeave={() => setHoveredUf(null)}
                    onClick={() => setSelectedUf(uf)}
                  />
                );
              })
            }
          </Geographies>

          {/* MARCADORES DE UF E HOTZONES PULSANTES NOS POLOS DE ENVIO */}
          {Object.entries(STATE_CENTROIDS).map(([uf, coords]) => {
            const metrics = stateMetricsMap[uf] || { pedidos: 0, pecas: 0, receita: 0 };
            const hasOrders = metrics.pedidos > 0;
            const isLeader = hasOrders && metrics.pedidos === maxOrders;
            const isHovered = hoveredUf === uf;
            const isSelected = activeState.uf === uf;
            const isCompact = COMPACT_COASTAL_UFS.has(uf);

            // Estados pequenos do litoral só exibem rótulo se tiverem envios ou estiverem ativos
            if (isCompact && !hasOrders && !isHovered && !isSelected) {
              return null;
            }

            return (
              <Marker
                key={`marker-${uf}`}
                coordinates={coords}
                style={{
                  default: { pointerEvents: 'none' },
                  hover: { pointerEvents: 'none' },
                  pressed: { pointerEvents: 'none' },
                }}
              >
                {hasOrders && (
                  <>
                    <circle
                      r={isLeader ? 15 : 10}
                      className={styles.hotzonePulse}
                      fill="none"
                      stroke="#4ade80"
                      strokeWidth={1.6}
                    />
                    <circle
                      r={isLeader ? 5.5 : 4}
                      fill="#052e16"
                      stroke="#ffffff"
                      strokeWidth={1.5}
                      className={styles.hotzoneCore}
                    />
                  </>
                )}

                <text
                  textAnchor="middle"
                  y={hasOrders ? -10 : 3}
                  className={styles.stateLabelText}
                  style={{
                    fill: hasOrders
                      ? '#ffffff'
                      : isHovered || isSelected
                        ? '#e4e4e7'
                        : 'rgba(255, 255, 255, 0.36)',
                    fontSize: hasOrders || isHovered || isSelected ? '10px' : '8.5px',
                    fontWeight: hasOrders || isHovered || isSelected ? 900 : 600,
                  }}
                >
                  {hasOrders ? `${uf} (${metrics.pedidos})` : uf}
                </text>
              </Marker>
            );
          })}
        </ComposableMap>

        <div className={styles.mapFooterBar}>
          <div className={styles.legendScale}>
            <span className={styles.legendLabelMuted}>0 envios</span>
            <div className={styles.legendGradientBar} />
            <span className={styles.legendLabelBright}>
              {maxOrders} {maxOrders === 1 ? 'envio' : 'envios'}
            </span>
          </div>

          {Array.isArray(regionData) && regionData.length > 0 && (
            <div className={styles.regionMiniChips}>
              {regionData.map((reg) => (
                <span key={reg.regiao} className={styles.regionMiniChip}>
                  <span
                    className={styles.regionMiniDot}
                    style={{ backgroundColor: reg.fill || REGION_COLORS[reg.regiao] || '#4ade80' }}
                  />
                  <span>{reg.regiao}:</span>
                  <strong>{reg.pedidos}</strong>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* COLUNA DIREITA: RAIO-X TERRITORIAL DE ENVIOS */}
      <div className={styles.sideDetailsCard}>
        <div>
          <div className={styles.sideHeader}>
            <div>
              <h3 className={styles.sideTitle}>RAIO-X TERRITORIAL</h3>
              <p className={styles.sideSub}>
                Endereços de entrega dos clientes • Passe o cursor ou clique em qualquer UF
              </p>
            </div>
            <Compass size={18} color="#4ade80" />
          </div>

          <div className={styles.activeStateBox} style={{ marginTop: '0.85rem' }}>
            <div className={styles.activeStateName}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span className={styles.activeStateUf}>{activeState.uf}</span>
                <span className={styles.activeStateFullTitle}>{activeState.name}</span>
              </div>
              <span
                className={styles.activeStateRegion}
                style={{
                  borderColor: REGION_COLORS[activeState.region] || '#4ade80',
                  color: REGION_COLORS[activeState.region] || '#4ade80',
                }}
              >
                {activeState.region}
              </span>
            </div>

            {/* CIDADES DE DESTINO DOS CLIENTES */}
            <div className={styles.activeCitiesRow}>
              <MapPin size={12} color={activeState.pedidos > 0 ? '#4ade80' : '#666666'} />
              {activeState.cidades.length > 0 ? (
                <span>
                  Principais destinos: <strong>{activeState.cidades.join(', ')}</strong>
                </span>
              ) : activeState.pedidos > 0 ? (
                <span>
                  Endereços confirmados em <strong>{activeState.name} ({activeState.uf})</strong>
                </span>
              ) : (
                <span style={{ color: '#666666' }}>
                  Nenhum envio registrado para clientes desta UF no período
                </span>
              )}
            </div>

            {/* MÉTRICAS LOGÍSTICAS E DE RECEITA DA UF */}
            <div className={styles.activeStateStatsThreeCols}>
              <div className={styles.activeStatItem}>
                <span className={styles.activeStatLabel}>
                  <Truck size={10} /> Envios / Pedidos
                </span>
                <strong className={styles.activeStatVal} style={{ color: '#4ade80' }}>
                  {activeState.pedidos} {activeState.pedidos === 1 ? 'envio' : 'envios'}
                </strong>
              </div>

              <div className={styles.activeStatItem}>
                <span className={styles.activeStatLabel}>
                  <Layers size={10} /> Roupas Enviadas
                </span>
                <strong className={styles.activeStatVal} style={{ color: '#60a5fa' }}>
                  {activeState.pecas} {activeState.pecas === 1 ? 'peça' : 'peças'}
                </strong>
              </div>

              <div className={styles.activeStatItem}>
                <span className={styles.activeStatLabel}>
                  <Package size={10} /> Faturamento UF
                </span>
                <strong className={styles.activeStatVal}>
                  R$ {activeState.receita.toFixed(2).replace('.', ',')}
                </strong>
              </div>
            </div>

            {/* BARRA DE PARTICIPAÇÃO NACIONAL */}
            <div className={styles.shareBlock}>
              <div className={styles.shareHeaderRow}>
                <span>
                  Volume logístico: <strong>{activeState.ordersPct}%</strong> dos envios
                </span>
                <span>
                  Receita: <strong>{activeState.revenuePct}%</strong> do Brasil
                </span>
              </div>
              <div className={styles.shareBarTrack}>
                <div
                  className={styles.shareBarFill}
                  style={{
                    width: `${Math.min(100, Math.max(activeState.pedidos > 0 ? 4 : 0, Number(activeState.ordersPct)))}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* RANKING DOS TOP POLOS DE ENVIO */}
        <div className={styles.rankingList}>
          <div className={styles.rankingHeaderRow}>
            <span className={styles.rankingHeader}>Top Destinos de Envio (Brasil)</span>
            <span className={styles.rankingHeaderMeta}>Peças • Envios • Valor</span>
          </div>

          {topRanking.map((rk, idx) => {
            const barWidthPct =
              maxOrders > 0 && rk.pedidos > 0
                ? Math.round((rk.pedidos / maxOrders) * 100)
                : 0;
            const isRowActive = activeState.uf === rk.uf;

            return (
              <div
                key={`rank-${rk.uf}`}
                className={`${styles.rankingRow} ${isRowActive ? styles.rankingRowActive : ''}`}
                onClick={() => setSelectedUf(rk.uf)}
                onMouseEnter={() => setHoveredUf(rk.uf)}
                onMouseLeave={() => setHoveredUf(null)}
              >
                {barWidthPct > 0 && (
                  <div
                    className={styles.rankingRowProgressBg}
                    style={{ width: `${barWidthPct}%` }}
                  />
                )}
                <div className={styles.rankingLeft}>
                  <span className={styles.rankingPos}>#{idx + 1}</span>
                  <span
                    className={styles.rankingRegionDot}
                    style={{ backgroundColor: REGION_COLORS[rk.region] || '#4ade80' }}
                    title={`Região ${rk.region}`}
                  />
                  <strong style={{ color: rk.pedidos > 0 ? '#4ade80' : '#cccccc' }}>
                    {rk.uf}
                  </strong>
                  <span className={styles.rankingStateName}>{rk.name}</span>
                </div>
                <div className={styles.rankingRight}>
                  <span className={styles.rankingPiecesBadge}>
                    {rk.pecas} {rk.pecas === 1 ? 'pç' : 'pçs'}
                  </span>
                  <span className={styles.rankingDivider}>•</span>
                  <span>{rk.pedidos} env.</span>
                  <span className={styles.rankingDivider}>|</span>
                  <strong>R$ {rk.receita.toFixed(0)}</strong>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default BrazilHeatmap;
