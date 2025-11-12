-- Criar tabela para emails de notificação sincronizados
-- Data: 2025-01-12
-- Descrição: Permite sincronizar emails de notificação entre web, iOS e Android

-- Criar tabela de emails de notificação
CREATE TABLE IF NOT EXISTS notification_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraint: usuário não pode ter mais de 3 emails
  CONSTRAINT unique_user_email UNIQUE (user_id, email)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_notification_emails_user_id ON notification_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_emails_email ON notification_emails(email);

-- RLS (Row Level Security)
ALTER TABLE notification_emails ENABLE ROW LEVEL SECURITY;

-- Policy: usuários podem ver apenas seus próprios emails
CREATE POLICY "Users can view their own notification emails"
  ON notification_emails
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: usuários podem inserir seus próprios emails
CREATE POLICY "Users can insert their own notification emails"
  ON notification_emails
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: usuários podem atualizar seus próprios emails
CREATE POLICY "Users can update their own notification emails"
  ON notification_emails
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: usuários podem deletar seus próprios emails
CREATE POLICY "Users can delete their own notification emails"
  ON notification_emails
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_notification_emails_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notification_emails_updated_at
  BEFORE UPDATE ON notification_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_emails_updated_at();

-- Comentários
COMMENT ON TABLE notification_emails IS 'Emails para receber notificações de manutenção';
COMMENT ON COLUMN notification_emails.user_id IS 'ID do usuário dono do email';
COMMENT ON COLUMN notification_emails.email IS 'Email para receber notificações';
