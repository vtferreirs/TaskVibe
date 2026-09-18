import jwt from "jsonwebtoken";

// Middleware de autenticação: aplicado a todas as rotas protegidas.
// Espera um header "Authorization: Bearer <token>" e, se o token for válido,
// anexa o id do usuário (req.usuarioId) para que os controllers identifiquem quem fez a requisição.
export default function auth(req, res, next) {
  const header = req.headers.authorization || "";

  // Sem o prefixo "Bearer " não há token válido na requisição
  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token não informado." });
  }

  // Remove o prefixo "Bearer " para extrair apenas o token (7 caracteres)
  const token = header.slice(7);

  try {
    // Verifica a assinatura e a validade do token com o segredo do .env
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Deixa o id do usuário autenticado disponível para o próximo middleware/controller
    req.usuarioId = payload.id;
    next();
  } catch (error) {
    // Token expirado, assinatura inválida ou malformado
    return res.status(401).json({ message: "Sessão inválida ou expirada." });
  }
}