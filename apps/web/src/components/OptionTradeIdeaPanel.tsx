import type { OptionTradeIdea } from "../lib/contracts";

interface OptionTradeIdeaPanelProps {
  idea: OptionTradeIdea | null;
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD"
});

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0
});

function formatDollars(value: number | null | undefined) {
  return typeof value === "number" ? currencyFormatter.format(value) : "--";
}

function formatPercent(value: number | null | undefined) {
  return typeof value === "number" ? `${numberFormatter.format(value)}%` : "--";
}

function formatSignedNumber(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "--";
  }

  return value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
}

function statusLabel(status: OptionTradeIdea["status"]) {
  if (status === "candidate_ready") {
    return "candidate";
  }
  if (status === "watch") {
    return "watch";
  }
  return "inactive";
}

export function OptionTradeIdeaPanel({ idea }: OptionTradeIdeaPanelProps) {
  if (!idea) {
    return (
      <div className="stateBlock">
        <strong>Options prep unavailable.</strong>
        <p>No option selection scaffold was returned for this signal yet.</p>
      </div>
    );
  }

  const selected = idea.selected_snapshot;
  const contract = idea.selected_contract;
  const premium = selected?.liquidity.ask
    ? selected.liquidity.ask * (contract?.multiplier ?? 100)
    : null;
  const providerTone =
    idea.provider_status.state === "connected" ? "low" : "caution";
  const topDrivers = [...idea.rationale.score_components]
    .sort((left, right) => right.contribution - left.contribution)
    .slice(0, 4);

  return (
    <div className="optionIdeaSection">
      <div className="sectionSubheader">
        <p className="eyebrow">Options prep</p>
      </div>

      <div className="optionPanelHeader">
        <div>
          <strong>{contract?.contract_symbol ?? "No contract selected"}</strong>
          <p className="detailCopy">{idea.rationale.summary}</p>
        </div>
        <div className="optionPanelMeta">
          <span className={`warningTag is${providerTone}`}>
            {idea.provider_status.state.replace(/_/g, " ")}
          </span>
          <span className="scorePill mono">{idea.selection_score.toFixed(1)}</span>
        </div>
      </div>

      {idea.provider_status.state !== "connected" ? (
        <div className="stateBlock optionProviderState">
          <strong>Provider not connected yet.</strong>
          <p>{idea.provider_status.message}</p>
        </div>
      ) : null}

      {selected && contract ? (
        <>
          <div className="optionIdeaGrid">
            <div>
              <span className="detailLabel">Bias</span>
              <strong>{idea.bias}</strong>
            </div>
            <div>
              <span className="detailLabel">Status</span>
              <strong>{statusLabel(idea.status)}</strong>
            </div>
            <div>
              <span className="detailLabel">Side</span>
              <strong>{contract.side}</strong>
            </div>
            <div>
              <span className="detailLabel">Strike</span>
              <strong>{formatDollars(contract.strike.price)}</strong>
            </div>
            <div>
              <span className="detailLabel">Expiration</span>
              <strong>{contract.expiration.date}</strong>
            </div>
            <div>
              <span className="detailLabel">DTE</span>
              <strong>{contract.expiration.days_to_expiration}</strong>
            </div>
            <div>
              <span className="detailLabel">Est. premium</span>
              <strong>{formatDollars(premium)}</strong>
            </div>
            <div>
              <span className="detailLabel">Candidates ranked</span>
              <strong>{idea.candidate_count}</strong>
            </div>
          </div>

          <div className="optionIdeaGrid">
            <div>
              <span className="detailLabel">Bid / ask</span>
              <strong>
                {formatDollars(selected.liquidity.bid)} / {formatDollars(selected.liquidity.ask)}
              </strong>
            </div>
            <div>
              <span className="detailLabel">Spread</span>
              <strong>
                {formatDollars(selected.liquidity.spread_width)} / {selected.liquidity.spread_bps ?? "--"} bps
              </strong>
            </div>
            <div>
              <span className="detailLabel">Volume</span>
              <strong>{selected.liquidity.volume.toLocaleString("en-US")}</strong>
            </div>
            <div>
              <span className="detailLabel">Open interest</span>
              <strong>{selected.liquidity.open_interest.value.toLocaleString("en-US")}</strong>
            </div>
            <div>
              <span className="detailLabel">IV</span>
              <strong>{formatPercent(selected.implied_volatility?.value ? selected.implied_volatility.value * 100 : null)}</strong>
            </div>
            <div>
              <span className="detailLabel">IV rank</span>
              <strong>{selected.implied_volatility?.rank_percentile ?? "--"}</strong>
            </div>
            <div>
              <span className="detailLabel">Delta</span>
              <strong>{formatSignedNumber(selected.greeks?.delta)}</strong>
            </div>
            <div>
              <span className="detailLabel">Gamma / Vega / Theta</span>
              <strong>
                {formatSignedNumber(selected.greeks?.gamma)} / {formatSignedNumber(selected.greeks?.vega)} / {formatSignedNumber(selected.greeks?.theta)}
              </strong>
            </div>
          </div>

          {topDrivers.length > 0 ? (
            <>
              <div className="sectionSubheader">
                <p className="eyebrow">Why this contract was chosen</p>
              </div>
              <div className="optionFactorGrid">
                {topDrivers.map((component) => (
                  <div
                    key={component.label}
                    className="infoCard"
                  >
                    <div className="watchlistCardTop">
                      <strong>{component.label.replace(/_/g, " ")}</strong>
                      <span className="scorePill mono">{component.score.toFixed(0)}</span>
                    </div>
                    <p>{component.detail}</p>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </>
      ) : (
        <div className="stateBlock">
          <strong>No contract candidate selected.</strong>
          <p>{idea.rationale.summary}</p>
        </div>
      )}

      {idea.rationale.reasons.length > 0 ? (
        <>
          <div className="sectionSubheader">
            <p className="eyebrow">Selection notes</p>
          </div>
          <div className="stackList">
            {idea.rationale.reasons.map((reason) => (
              <div
                key={reason}
                className="infoCard"
              >
                <strong>Reason</strong>
                <p>{reason}</p>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {idea.rationale.warnings.length > 0 ? (
        <>
          <div className="sectionSubheader">
            <p className="eyebrow">Constraints</p>
          </div>
          <div className="warningList">
            {idea.rationale.warnings.map((warning) => (
              <div
                key={warning}
                className="warningItem"
              >
                <span className="warningTag iscaution">watch</span>
                <div>
                  <strong>Execution note</strong>
                  <p>{warning}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
