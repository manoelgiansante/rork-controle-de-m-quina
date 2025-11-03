# Correção: Salvar Nova Propriedade no Web

## Problema
O botão "Salvar" na modal de criar propriedade não funciona no website.

## Solução

Execute os comandos SQL abaixo no **Supabase Dashboard → SQL Editor**:

```sql
-- 1. Adicionar default para user_id (auto-preencher com usuário autenticado)
ALTER TABLE public.properties 
ALTER COLUMN user_id SET DEFAULT auth.uid();

-- 2. Garantir que RLS está ativo
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- 3. Recriar policies (limpar e criar novamente)
DROP POLICY IF EXISTS properties_sel ON public.properties;
DROP POLICY IF EXISTS properties_ins ON public.properties;
DROP POLICY IF EXISTS properties_upd ON public.properties;
DROP POLICY IF EXISTS properties_del ON public.properties;

-- 4. Policy de SELECT (ler apenas próprias propriedades)
CREATE POLICY properties_sel ON public.properties
FOR SELECT
USING (auth.uid() = user_id);

-- 5. Policy de INSERT (criar apenas com seu user_id)
CREATE POLICY properties_ins ON public.properties
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 6. Policy de UPDATE (editar apenas próprias propriedades)
CREATE POLICY properties_upd ON public.properties
FOR UPDATE
USING (auth.uid() = user_id);

-- 7. Policy de DELETE (deletar apenas próprias propriedades)
CREATE POLICY properties_del ON public.properties
FOR DELETE
USING (auth.uid() = user_id);
```

## Verificação

Após executar o SQL acima:

1. Faça login no website: https://controledemaquina.com.br
2. Clique no seletor de fazenda
3. Clique em "Adicionar nova propriedade"
4. Digite um nome e clique em "Salvar"
5. Verifique se a propriedade foi criada

## Debug (se continuar com problema)

Abra o Console do navegador (F12) e verifique:

1. **Erro 401/403**: Falta executar o SQL acima
2. **Erro 400**: Verifique se o campo `user_id` tem o default configurado
3. **Network → POST /rest/v1/properties**: Ver detalhes do erro

Se o erro persistir, copie a mensagem de erro do Console e envie para análise.
