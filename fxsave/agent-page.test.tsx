import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import copy from "copy-to-clipboard";
import { vi } from "vitest";

import { FxsaveAgentPage } from "@/fxsave/agent-page";

vi.mock("copy-to-clipboard", () => ({
  default: vi.fn(),
}));

describe("FxsaveAgentPage", () => {
  it("renders the agent hero and primary integration details", () => {
    render(<FxsaveAgentPage />);

    expect(screen.getByRole("heading", { name: /hey, agent/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /app/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /agent/i })).toHaveAttribute("href", "/agent");
    expect(
      screen.getByText(/install a skill that turns fragmented fxusd strategies into one agent-friendly layer\./i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/cover fxsave shortcuts, hydrex liquidity, and morpho monitoring plus defense from one skill\./i),
    ).toBeInTheDocument();
    expect(screen.getByText(/what you can do/i)).toBeInTheDocument();
    expect(screen.getByText(/> mint fxsave/i)).toBeInTheDocument();
    expect(screen.getByText(/deposit all my fxusd in wallet to fxsave\./i)).toBeInTheDocument();
    expect(screen.getByText(/> use hydrex/i)).toBeInTheDocument();
    expect(screen.getByText(/deposit 500 fxusd into the safest stablecoin-farming hydrex vault\./i)).toBeInTheDocument();
    expect(screen.getByText(/> watch morpho risk/i)).toBeInTheDocument();
    expect(
      screen.getByText(/alert me if my bnkr-backed fxusd borrow moves into warning or critical territory\./i),
    ).toBeInTheDocument();
    expect(screen.getByText(/> repay morpho debt/i)).toBeInTheDocument();
    expect(screen.getByText(/build a repay plan to lower risk on my morpho fxusd position\./i)).toBeInTheDocument();
    expect(screen.getByText(/> add morpho collateral/i)).toBeInTheDocument();
    expect(screen.getByText(/build an add-collateral plan for my bnkr-backed fxusd borrow\./i)).toBeInTheDocument();
    expect(screen.queryByText(/skill location:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/skill repo:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/install destination:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/auth/i)).not.toBeInTheDocument();
    expect(screen.getByText(/the output is the self-contained fxusd skill file\./i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /use the skill to route, monitor, and defend fxsave, hydrex, and morpho workflows with protocol-specific guardrails\./i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /curl -Ls https:\/\/raw\.githubusercontent\.com\/huwangtao123\/fxsave-dapp\/main\/skill\/SKILL\.md/i,
      ),
    ).toBeInTheDocument();
  });

  it("copies the install command and shows copied state", async () => {
    vi.mocked(copy).mockReturnValue(true);

    render(<FxsaveAgentPage />);

    fireEvent.click(screen.getByRole("button", { name: /copy/i }));

    expect(copy).toHaveBeenCalledWith(
      "curl -Ls https://raw.githubusercontent.com/huwangtao123/fxsave-dapp/main/skill/SKILL.md",
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /copied/i })).toBeInTheDocument();
    });
  });

  it("keeps copy label when copy fails", () => {
    vi.mocked(copy).mockReturnValue(false);

    render(<FxsaveAgentPage />);

    fireEvent.click(screen.getByRole("button", { name: /copy/i }));

    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
  });
});
