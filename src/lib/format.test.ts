import { describe, it, expect } from "vitest";
import { soDigitos, whatsappLink } from "../lib/format";

describe("soDigitos", () => {
  it("remove tudo que não é dígito", () => {
    expect(soDigitos("(11) 99999-9999")).toBe("11999999999");
  });
});

describe("whatsappLink", () => {
  it("adiciona código 55 quando ausente", () => {
    expect(whatsappLink("11999999999")).toBe("https://wa.me/5511999999999");
  });

  it("não duplica o 55 quando já existe", () => {
    expect(whatsappLink("5511999999999")).toBe("https://wa.me/5511999999999");
  });

  it("codifica o texto da mensagem", () => {
    expect(whatsappLink("11999999999", "Olá, lista!")).toBe(
      "https://wa.me/5511999999999?text=Ol%C3%A1%2C%20lista!"
    );
  });
});
