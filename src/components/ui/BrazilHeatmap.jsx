import React, { useState, useMemo } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import { Compass, ShoppingBag, DollarSign, TrendingUp, Info } from 'lucide-react';
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

// Metadados dos Estados Brasileiros e Macrorregiões
const BRAZIL_STATES_META = {
  AC: { name: 'Acre', region: 'Norte' },
  AL: { name: 'Alagoas', region: 'Nordeste' },
  AM: { name: 'Amazonas', region: 'Norte' },
  AP: { name: 'Amapá', region: 'Norte' },
  BA: { name: 'Bahia', region: 'Nordeste' },
  CE: { name: 'Ceará', region: 'Nordeste' },
  DF: { name: 'Distrito Federal', region: 'Centro-Oeste' },
  ES: { name: 'Espírito Santo', region: 'Sudeste' },
  GO: { name: 'Goiás', region: 'Centro-Oeste' },
  MA: { name: 'Maranhão', region: 'Nordeste' },
  MG: { name: 'Minas Gerais', region: 'Sudeste' },
  MS: { name: 'Mato Grosso do Sul', region: 'Centro-Oeste' },
  MT: { name: 'Mato Grosso', region: 'Centro-Oeste' },
  PA: { name: 'Pará', region: 'Norte' },
  PB: { name: 'Paraíba', region: 'Nordeste' },
  PE: { name: 'Pernambuco', region: 'Nordeste' },
  PI: { name: 'Piauí', region: 'Nordeste' },
  PR: { name: 'Paraná', region: 'Sul' },
  RJ: { name: 'Rio de Janeiro', region: 'Sudeste' },
  RN: { name: 'Rio Grande do Norte', region: 'Nordeste' },
  RO: { name: 'Rondônia', region: 'Norte' },
  RR: { name: 'Roraima', region: 'Norte' },
  RS: { name: 'Rio Grande do Sul', region: 'Sul' },
  SC: { name: 'Santa Catarina', region: 'Sul' },
  SE: { name: 'Sergipe', region: 'Nordeste' },
  SP: { name: 'São Paulo', region: 'Sudeste' },
  TO: { name: 'Tocantins', region: 'Norte' },
};

const REGION_COLORS = {
  Sudeste: '#4ade80',
  Sul: '#60a5fa',
  'Centro-Oeste': '#facc15',
  Nordeste: '#f87171',
  Norte: '#a78bfa',
};

export function BrazilHeatmap({ stateData = [], totalOrders = 0, totalRevenue = 0 }) {
  // Mapa de métricas por UF a partir dos pedidos reais
  const stateMetricsMap = useMemo(() => {
    const map = {};
    if (Array.isArray(stateData)) {
      stateData.forEach((st) => {
        const uf = String(st.uf || st.estado || '').toUpperCase().trim();
        if (uf) {
          map[uf] = {
            pedidos: Number(st.pedidos || 0),
            receita: Number(st.receita || 0),
            regiao: st.regiao || BRAZIL_STATES_META[uf]?.region || 'Sudeste',
          };
        }
      });
    }
    return map;
  }, [stateData]);

  // Volume máximo de pedidos para cálculo da escala
  const maxOrders = useMemo(() => {
    let max = 0;
    Object.values(stateMetricsMap).forEach((s) => {
      if (s.pedidos > max) max = s.pedidos;
    });
    return Math.max(max, 1);
  }, [stateMetricsMap]);

  // Escala linear D3 para o mapa coroplético (gradiente de calor)
  const colorScale = useMemo(() => {
    return scaleLinear()
      .domain([1, Math.max(maxOrders, 2)])
      .range(['#1b4332', '#4ade80']);
  }, [maxOrders]);

  // Estado interativo compartilhado entre o mapa e o painel de Raio-X
  const [hoveredUf, setHoveredUf] = useState(null);
  const [selectedUf, setSelectedUf] = useState('SP');

  // Estado atualmente exibido no Raio-X Territorial
  const activeState = useMemo(() => {
    const targetUf = hoveredUf || selectedUf || 'SP';
    const meta = BRAZIL_STATES_META[targetUf] || BRAZIL_STATES_META['SP'];
    const metrics = stateMetricsMap[targetUf] || { pedidos: 0, receita: 0, regiao: meta.region };
    const pct = totalRevenue > 0 ? ((metrics.receita / totalRevenue) * 100).toFixed(1) : '0.0';

    return {
      uf: targetUf,
      name: meta.name,
      region: meta.region,
      pedidos: metrics.pedidos,
      receita: metrics.receita,
      pct,
    };
  }, [hoveredUf, selectedUf, stateMetricsMap, totalRevenue]);

  // Ranking ordenado dos 5 maiores polos
  const topRanking = useMemo(() => {
    return Object.entries(BRAZIL_STATES_META)
      .map(([uf, meta]) => {
        const m = stateMetricsMap[uf] || { pedidos: 0, receita: 0 };
        return {
          uf,
          name: meta.name,
          region: meta.region,
          pedidos: m.pedidos,
          receita: m.receita,
        };
      })
      .sort((a, b) => b.pedidos - a.pedidos || b.receita - a.receita)
      .slice(0, 5);
  }, [stateMetricsMap]);

  return (
    <div className={styles.heatmapContainer}>
      {/* MAPA COROPLÉTICO VETORIAL DO BRASIL VIA REACT-SIMPLE-MAPS */}
      <div className={styles.mapWrapper}>

        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 780,
            center: [-54, -15],
          }}
          width={600}
          height={600}
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

                const metrics = stateMetricsMap[uf] || { pedidos: 0, receita: 0 };
                const hasOrders = metrics.pedidos > 0;
                const isHovered = hoveredUf === uf;
                const isSelected = activeState.uf === uf;

                // Cor do estado: grafite escuro com 0 pedidos, gradiente verde neon com pedidos
                let fillColor = '#141414';
                if (hasOrders) {
                  fillColor = colorScale(metrics.pedidos);
                }
                if (isHovered || isSelected) {
                  fillColor = hasOrders ? '#22c55e' : '#262626';
                }

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fillColor}
                    stroke={isSelected || isHovered ? '#4ade80' : 'rgba(255, 255, 255, 0.15)'}
                    strokeWidth={isSelected || isHovered ? 1.6 : 0.6}
                    style={{
                      default: {
                        outline: 'none',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer',
                      },
                      hover: {
                        outline: 'none',
                        fill: hasOrders ? '#4ade80' : '#2c2c2c',
                        cursor: 'pointer',
                        filter: 'drop-shadow(0 0 6px rgba(74, 222, 128, 0.6))',
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

          {/* HOTZONES PULSANTES NOS ESTADOS COM PEDIDOS CONFIRMADOS */}
          {Object.entries(STATE_CENTROIDS).map(([uf, coords]) => {
            const metrics = stateMetricsMap[uf] || { pedidos: 0, receita: 0 };
            const hasOrders = metrics.pedidos > 0;
            const isLeader = metrics.pedidos === maxOrders && maxOrders > 0;
            const isHovered = hoveredUf === uf;
            const isSelected = selectedUf === uf;

            if (!hasOrders && !isHovered && !isSelected) return null;

            return (
              <Marker key={`marker-${uf}`} coordinates={coords}>
                {hasOrders && (
                  <>
                    <circle
                      r={isLeader ? 14 : 9}
                      className={styles.hotzonePulse}
                      fill="none"
                      stroke="#4ade80"
                      strokeWidth={1.5}
                    />
                    <circle
                      r={isLeader ? 5 : 3.5}
                      fill="#4ade80"
                      className={styles.hotzoneCore}
                    />
                  </>
                )}
                <text
                  textAnchor="middle"
                  y={hasOrders ? -10 : 3}
                  className={styles.stateLabelText}
                  style={{
                    fill: hasOrders ? '#4ade80' : '#ffffff',
                    fontWeight: hasOrders || isHovered ? 900 : 700,
                  }}
                >
                  {uf}
                </text>
              </Marker>
            );
          })}
        </ComposableMap>

        <div className={styles.mapFooterLegend}>
          <div className={styles.legendScale}>
            <span style={{ fontSize: '0.65rem', color: '#777777' }}>0 pedidos</span>
            <div className={styles.legendGradientBar} />
            <span style={{ fontSize: '0.65rem', color: '#4ade80' }}>
              {maxOrders} {maxOrders === 1 ? 'pedido' : 'pedidos'}
            </span>
          </div>
        </div>
      </div>

      {/* RAIO-X TERRITORIAL DO ESTADO SELECIONADO / EM HOVER */}
      <div className={styles.sideDetailsCard}>
        <div>
          <div className={styles.sideHeader}>
            <div>
              <h3 className={styles.sideTitle}>RAIO-X TERRITORIAL</h3>
              <p className={styles.sideSub}>Passe o cursor ou clique em qualquer UF para inspecionar</p>
            </div>
            <Compass size={18} color="#4ade80" />
          </div>

          <div className={styles.activeStateBox} style={{ marginTop: '0.85rem' }}>
            <div className={styles.activeStateName}>
              <div>
                <span className={styles.activeStateUf}>{activeState.uf}</span>
                <span
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    marginLeft: '0.55rem',
                    color: '#e5e5e5',
                  }}
                >
                  {activeState.name}
                </span>
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

            <div className={styles.activeStateStats}>
              <div className={styles.activeStatItem}>
                <span className={styles.activeStatLabel}>Pedidos Entregues</span>
                <strong className={styles.activeStatVal} style={{ color: '#4ade80' }}>
                  {activeState.pedidos} {activeState.pedidos === 1 ? 'pedido' : 'pedidos'}
                </strong>
              </div>
              <div className={styles.activeStatItem}>
                <span className={styles.activeStatLabel}>Faturamento</span>
                <strong className={styles.activeStatVal}>
                  R$ {activeState.receita.toFixed(2).replace('.', ',')}
                </strong>
              </div>
            </div>

            <div style={{ fontSize: '0.72rem', color: '#888888', marginTop: '0.35rem' }}>
              Participação: <strong style={{ color: '#e5e5e5' }}>{activeState.pct}%</strong> de toda a receita nacional da THR33 no período.
            </div>
          </div>
        </div>

        {/* TOP POLOS DE VENDAS */}
        <div className={styles.rankingList}>
          <span className={styles.rankingHeader}>Top Polos de Vendas (Brasil)</span>
          {topRanking.map((rk, idx) => (
            <div
              key={`rank-${rk.uf}`}
              className={`${styles.rankingRow} ${activeState.uf === rk.uf ? styles.rankingRowActive : ''}`}
              onClick={() => setSelectedUf(rk.uf)}
              onMouseEnter={() => setHoveredUf(rk.uf)}
              onMouseLeave={() => setHoveredUf(null)}
            >
              <div className={styles.rankingLeft}>
                <span className={styles.rankingPos}>#{idx + 1}</span>
                <strong style={{ color: rk.pedidos > 0 ? '#4ade80' : '#cccccc' }}>{rk.uf}</strong>
                <span style={{ color: '#888888', fontSize: '0.7rem' }}>{rk.name}</span>
              </div>
              <div className={styles.rankingRight}>
                {rk.pedidos} un. | R$ {rk.receita.toFixed(0)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default BrazilHeatmap;
