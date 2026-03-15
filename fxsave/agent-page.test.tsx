import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { FxsaveAgentPage } from "@/fxsave/agent-page";

describe("FxsaveAgentPage", () => {
  it("renders the agent hero and primary integration details", () => {
    render(<FxsaveAgentPage />);

    expect(screen.getByRole("heading", { name: /hey, agent/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /app/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /agent/i })).toHaveAttribute("href", "/agent");
    expect(screen.getByText(/install a skill that can mint or redeem fxsave in one step/i)).toBeInTheDocument();
    expect(screen.getByText(/what you can do/i)).toBeInTheDocument();
    expect(screen.getByText(/> mint fxsave/i)).toBeInTheDocument();
    expect(screen.getByText(/deposit all my fxusd in wallet to fxsave\./i)).toBeInTheDocument();
    expect(screen.getByText(/> redeem fxsave/i)).toBeInTheDocument();
    expect(screen.getByText(/redeem 50% of my fxsave to fxusd\./i)).toBeInTheDocument();
    expect(screen.getByText(/skill location:/i)).toBeInTheDocument();
    expect(
      screen.getByText(/https:\/\/github\.com\/huwangtao123\/fxsave-dapp\/blob\/main\/skill\/SKILL\.md/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/skill repo:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/https:\/\/github\.com\/huwangtao123\/fxsave-dapp\.git/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/install destination:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/~\/\.codex\/skills\/fxsave\//i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/auth/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(
        /tmpdir=\$\(mktemp -d\) && git clone --depth 1 https:\/\/github\.com\/huwangtao123\/fxsave-dapp\.git "\$tmpdir" && mkdir -p ~\/\.codex\/skills\/fxsave && cp -R "\$tmpdir\/skill\/\." ~\/\.codex\/skills\/fxsave\/ && rm -rf "\$tmpdir"/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows a copy control for the install command", async () => {
    const user = userEvent.setup();
    const clipboard = {
      writeText: vi.fn().mockResolvedValue(undefined),
    };

    vi.stubGlobal("navigator", {
      clipboard,
    });

    render(<FxsaveAgentPage />);

    await user.click(screen.getByRole("button", { name: /copy/i }));

    expect(clipboard.writeText).toHaveBeenCalledWith(
      'tmpdir=$(mktemp -d) && git clone --depth 1 https://github.com/huwangtao123/fxsave-dapp.git "$tmpdir" && mkdir -p ~/.codex/skills/fxsave && cp -R "$tmpdir/skill/." ~/.codex/skills/fxsave/ && rm -rf "$tmpdir"',
    );
  });
});
