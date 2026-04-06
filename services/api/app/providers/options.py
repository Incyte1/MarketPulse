from __future__ import annotations

from datetime import date

from app.models import (
    OptionChainSnapshot,
    OptionContractSnapshot,
    OptionExpiration,
    OptionGreeks,
    OptionSide,
    OptionStrike,
    OptionsProviderStatus
)


class OptionsProviderError(RuntimeError):
    pass


class OptionsProviderNotConnectedError(OptionsProviderError):
    pass


class OptionsProvider:
    provider_name: str

    def get_status(self) -> OptionsProviderStatus:
        raise NotImplementedError

    def get_option_chain(self, underlying_symbol: str) -> OptionChainSnapshot:
        raise NotImplementedError

    def get_option_snapshot(self, contract_symbol: str) -> OptionContractSnapshot:
        raise NotImplementedError

    def get_greeks(self, contract_symbol: str) -> OptionGreeks:
        raise NotImplementedError

    def get_expirations(self, underlying_symbol: str) -> list[OptionExpiration]:
        raise NotImplementedError

    def get_strikes(
        self,
        underlying_symbol: str,
        expiration_date: date | None = None
    ) -> list[OptionStrike]:
        raise NotImplementedError

    def get_underlying_linked_contract_candidates(
        self,
        underlying_symbol: str,
        side: OptionSide,
        *,
        expiration_date: date | None = None
    ) -> list[OptionContractSnapshot]:
        raise NotImplementedError


class DisconnectedOptionsProvider(OptionsProvider):
    provider_name = "disconnected"

    def get_status(self) -> OptionsProviderStatus:
        return OptionsProviderStatus(
            provider="disconnected",
            state="not_connected",
            configured=False,
            live_requests_enabled=False,
            message="No options provider is configured yet. Unveni is using planning-only option candidates."
        )

    def _raise(self) -> None:
        raise OptionsProviderNotConnectedError(
            "The options provider is not connected yet."
        )

    def get_option_chain(self, underlying_symbol: str) -> OptionChainSnapshot:
        self._raise()

    def get_option_snapshot(self, contract_symbol: str) -> OptionContractSnapshot:
        self._raise()

    def get_greeks(self, contract_symbol: str) -> OptionGreeks:
        self._raise()

    def get_expirations(self, underlying_symbol: str) -> list[OptionExpiration]:
        self._raise()

    def get_strikes(
        self,
        underlying_symbol: str,
        expiration_date: date | None = None
    ) -> list[OptionStrike]:
        self._raise()

    def get_underlying_linked_contract_candidates(
        self,
        underlying_symbol: str,
        side: OptionSide,
        *,
        expiration_date: date | None = None
    ) -> list[OptionContractSnapshot]:
        self._raise()


class AlpacaOptionsProvider(OptionsProvider):
    provider_name = "alpaca"

    def __init__(
        self,
        *,
        api_key: str | None,
        secret_key: str | None,
        base_url: str
    ) -> None:
        self.api_key = api_key
        self.secret_key = secret_key
        self.base_url = base_url

    def get_status(self) -> OptionsProviderStatus:
        configured = bool(self.api_key and self.secret_key)
        return OptionsProviderStatus(
            provider="alpaca",
            state="integration_pending" if configured else "not_connected",
            configured=configured,
            live_requests_enabled=False,
            message=(
                "Alpaca credentials are configured, but live options requests are not implemented in this phase yet."
                if configured
                else "Alpaca options credentials are not configured yet. Unveni is using planning-only option candidates."
            )
        )

    def _raise(self) -> None:
        status = self.get_status()
        if not status.configured:
            raise OptionsProviderNotConnectedError(status.message)
        raise OptionsProviderError(status.message)

    def get_option_chain(self, underlying_symbol: str) -> OptionChainSnapshot:
        self._raise()

    def get_option_snapshot(self, contract_symbol: str) -> OptionContractSnapshot:
        self._raise()

    def get_greeks(self, contract_symbol: str) -> OptionGreeks:
        self._raise()

    def get_expirations(self, underlying_symbol: str) -> list[OptionExpiration]:
        self._raise()

    def get_strikes(
        self,
        underlying_symbol: str,
        expiration_date: date | None = None
    ) -> list[OptionStrike]:
        self._raise()

    def get_underlying_linked_contract_candidates(
        self,
        underlying_symbol: str,
        side: OptionSide,
        *,
        expiration_date: date | None = None
    ) -> list[OptionContractSnapshot]:
        self._raise()
