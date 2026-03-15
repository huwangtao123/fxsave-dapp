import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { FxsaveMintApp } from "@/fxsave/fxsave-mint-app";

vi.mock("wagmi", () => ({
  useAccount: () => ({
    address: undefined,
    chainId: undefined,
    isConnected: false,
  }),
  useConnect: () => ({
    connectAsync: vi.fn(),
    connectors: [{ id: "injected", name: "Injected" }],
    isPending: false,
  }),
  useDisconnect: () => ({
    disconnect: vi.fn(),
  }),
  usePublicClient: () => undefined,
  useSendTransaction: () => ({
    sendTransactionAsync: vi.fn(),
    isPending: false,
  }),
  useSwitchChain: () => ({
    switchChainAsync: vi.fn(),
    isPending: false,
  }),
  useWaitForTransactionReceipt: () => ({
    error: undefined,
    isLoading: false,
    isSuccess: false,
  }),
}));

describe("FxsaveMintApp", () => {
  it("renders the disconnected mint experience", () => {
    render(<FxsaveMintApp />);

    expect(screen.getByRole("heading", { name: /mint and redeem fxsave on base/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /connect wallet/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /app/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /agent/i })).toHaveAttribute("href", "/agent");
    expect(screen.getByText(/balance: 0 fxusd/i)).toBeInTheDocument();
  });

  it("lets the user flip into redeem mode", async () => {
    const user = userEvent.setup();
    render(<FxsaveMintApp />);

    await user.click(screen.getByRole("button", { name: /flip mint direction/i }));

    expect(screen.getByText(/mode: redeem/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /exit the fxsave position/i })).toBeInTheDocument();
  });
});
