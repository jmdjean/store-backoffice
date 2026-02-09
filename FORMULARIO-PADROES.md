# Padrões de Formulários — Senior Care Backoffice

Este documento descreve como os formulários devem ser preenchidos, validados e mascarados no projeto, para servir de referência a desenvolvedores e a assistentes (ex.: Cursor) que implementem ou alterem telas.

---

## 1. Stack de formulários

- **React Hook Form** para estado e submit.
- **Zod** para schemas e validação (via `zodResolver`).
- **Schemas** derivados do banco em `shared/schema.ts` com `createInsertSchema` (drizzle-zod); extensões locais quando necessário (ex.: `formSchema = insertPatientSchema.extend({ ... })`).
- **UI**: componentes em `@/components/ui/form` (`Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`).

---

## 2. Telefone

### Onde usar
- Contato principal (paciente, funcionário, sede).
- Lista de contatos (nome + telefone) em pacientes/usuários/funcionários.

### Biblioteca e máscara
- **Arquivo:** `client/src/lib/phoneMask.ts`
- **Máscara de exibição:** `(XX) XXXXX-XXXX` (celular) ou `(XX) XXXX-XXXX` (fixo).
- **Armazenamento:** apenas dígitos (string), até 11 caracteres.

### Constantes
```ts
PHONE_DIGITS_MAX = 11
PHONE_MASK_MAX_LENGTH = 15  // tamanho da string já formatada
```

### Uso no input
- **Valor exibido:** `formatPhone(field.value ?? "")`
- **onChange:** gravar só dígitos: `field.onChange(extractDigits(e.target.value))`
- **maxLength:** `PHONE_MASK_MAX_LENGTH` (15) para limitar o que o usuário digita.

### Exemplo (campo único)
```tsx
import { formatPhone, extractDigits, PHONE_MASK_MAX_LENGTH } from "@/lib/phoneMask";

<Input
  placeholder="(00) 00000-0000"
  value={formatPhone(field.value ?? "")}
  onChange={(e) => field.onChange(extractDigits(e.target.value))}
  maxLength={PHONE_MASK_MAX_LENGTH}
/>
```

### Contatos múltiplos (nome + telefone)
- Estado local: `[{ name: string, phone: string }]`.
- Telefone de cada item: mesmo padrão (exibir com `formatPhone`, gravar com `extractDigits`).
- Persistência: string no formato `"Nome1 - (11) 99999-9999; Nome2 - (11) 88888-8888"` (usar `formatPhone` ao montar e `extractDigits` ao fazer parse ao carregar).

---

## 3. CPF

### Onde usar
- Cadastro de paciente (campo CPF).

### Biblioteca e máscara
- **Arquivo:** `client/src/lib/cpfCepMask.ts`
- **Máscara:** `XXX.XXX.XXX-XX` (11 dígitos).
- **Armazenamento:** apenas dígitos (string), até 11 caracteres.

### Uso no input
- **Valor exibido:** `formatCPF(field.value ?? "")`
- **onChange:** `field.onChange(extractDigits(e.target.value))` (o `extractDigits` de `cpfCepMask` limita a 11 dígitos internamente no `formatCPF`).

### Exemplo
```tsx
import { formatCPF, extractDigits as extractDigitsCPF } from "@/lib/cpfCepMask";

<Input
  placeholder="000.000.000-00"
  value={formatCPF(field.value ?? "")}
  onChange={(e) => field.onChange(extractDigitsCPF(e.target.value))}
/>
```

### Validação
- O projeto não aplica validação de dígitos verificadores de CPF no schema; o campo é opcional. Se no futuro for obrigatório ou validado, manter o valor sempre em dígitos (string) para o schema.

---

## 4. CEP

### Onde usar
- Endereço do paciente (campo CEP).

### Biblioteca e máscara
- **Arquivo:** `client/src/lib/cpfCepMask.ts`
- **Máscara:** `XXXXX-XXX` (8 dígitos).
- **Armazenamento:** apenas dígitos (string), até 8 caracteres.

### Uso no input
- **Valor exibido:** `formatCEP(field.value ?? "")`
- **onChange:** `field.onChange(extractDigitsCPF(e.target.value))`

### Exemplo
```tsx
import { formatCEP, extractDigits as extractDigitsCPF } from "@/lib/cpfCepMask";

<Input
  placeholder="00000-000"
  value={formatCEP(field.value ?? "")}
  onChange={(e) => field.onChange(extractDigitsCPF(e.target.value))}
/>
```

---

## 5. E-mail

### Onde usar
- Login (username = e-mail).
- Cadastro/edição de usuário (username como e-mail de acesso).
- Funcionário (campo e-mail opcional).

### Máscara
- Não se usa máscara visual; usar `type="email"` para teclado e acessibilidade.

### Validação
- **Obrigatório (usuário):** schema com `username`/`password` obrigatórios (ex.: `insertUserSchema`).
- **Opcional com formato:** quando o campo existe mas não é obrigatório, usar Zod para formato, ex.: `z.string().email("Email inválido").optional().or(z.literal(""))` (ex.: `EmployeeForm`).

### Exemplo (obrigatório)
```tsx
<Input type="email" placeholder="usuario@empresa.com" {...field} />
```

### Exemplo (opcional com validação de formato)
- No schema: `email: z.string().email("Email inválido").optional().or(z.literal(""))`
- No JSX: `<Input type="email" placeholder="email@exemplo.com" {...field} />`

---

## 6. Nome (completo / título)

### Onde usar
- Paciente: `fullName`
- Usuário: `fullName`
- Funcionário: `fullName`
- Sede: `name` (título da sede)

### Validação
- **Schema (backend):** campos `full_name` / `name` com `.notNull()` nas tabelas.
- **Formulário:** garantir preenchimento com Zod, ex.:
  - `z.string().min(1, "Informe o nome")` (funcionário)
  - ou uso do `insertPatientSchema` / `insertUserSchema` / `insertHeadquarterSchema` que já refletem obrigatoriedade

### Exemplo
```tsx
<FormLabel>Nome completo *</FormLabel>
<Input placeholder="Maria da Silva" {...field} />
<FormMessage />
```

- Rotulagem: usar asterisco (*) em campos obrigatórios.

---

## 7. Valores monetários (BRL)

### Onde usar
- Sede: valor do aluguel (`rentValue`).
- Funcionário: salário e salário com impostos (`salary`, `salaryWithTaxes`).
- Listagens e detalhes financeiros: exibição em tabelas e cards.

### Armazenamento no banco
- **Sempre em centavos (integer).** Ex.: R$ 1.234,56 → `123456`.

### Biblioteca
- **Arquivo:** `client/src/lib/currency.ts`
- **Componente de input:** `client/src/components/CurrencyInput.tsx` (quando o valor no form for em **reais** para o usuário editar).

### Funções principais
| Função | Uso |
|--------|-----|
| `formatCentsToBRL(valueInCents)` | Exibir valor em centavos como "R$ 1.234,56" (listagens, detalhes). |
| `formatReais(value)` | Exibir número em reais já em decimal (ex.: 1234.56 → "R$ 1.234,56"). |
| `formatReaisWithoutSymbol(value)` | Formato decimal pt-BR sem "R$" (usado internamente no `CurrencyInput`). |
| `parseCurrencyToNumber(raw)` | Converte string digitada (ex.: "1.234,56" ou "R$ 1.234,56") em número decimal (1234.56). |

### Padrão 1: Form em reais, API em centavos (ex.: Sede)
- **Form:** valor em reais (número). Ex.: 1500.50.
- **Componente:** `<CurrencyInput value={field.value || 0} onValueChange={(v) => field.onChange(v)} />`.
- **Submit:** enviar em centavos: `rentValue: Math.round((values.rentValue || 0) * 100)`.
- **Carregar para edição:** `rentValue: (selectedHq.rentValue || 0) / 100`.

### Padrão 2: Form em centavos (ex.: Funcionário – salário)
- **Form:** valor em centavos (número). Ex.: 150050.
- **Exibição no input:** `formatCentsToBRL(field.value)`.
- **onChange:** `const numericValue = parseCurrencyToNumber(e.target.value); field.onChange(numericValue * 100);`
- **Submit:** enviar `salary` / `salaryWithTaxes` já em centavos (sem conversão no submit).
- **Listagem/detalhe:** sempre `formatCentsToBRL(employee.salary)`.

### Exemplo com CurrencyInput (valor em reais no form)
```tsx
import { CurrencyInput } from "@/components/CurrencyInput";

<FormField name="rentValue" ...>
  <CurrencyInput
    value={field.value || 0}
    onValueChange={(val) => field.onChange(val)}
  />
</FormField>
// No submit:
rentValue: Math.round((values.rentValue || 0) * 100)
```

### Exemplo com Input manual (valor em centavos no form)
```tsx
import { formatCentsToBRL, parseCurrencyToNumber } from "@/lib/currency";

<Input
  placeholder="R$ 0,00"
  value={formatCentsToBRL(field.value)}
  onChange={(e) => {
    const numericValue = parseCurrencyToNumber(e.target.value);
    field.onChange(numericValue * 100);
  }}
/>
```

### Regra de ouro
- **Exibição:** sempre usar `formatCentsToBRL` (ou `formatReais` quando o dado já estiver em reais) em listagens e telas de detalhe.
- **Input:** ou usar `CurrencyInput` (valor em reais no form e converter para centavos no submit) ou Input com `formatCentsToBRL` + `parseCurrencyToNumber` e armazenar centavos no form.

---

## 8. Validação de preenchimento (obrigatório)

### Fonte da verdade
- **Backend:** `shared/schema.ts` — tabelas com `.notNull()` indicam campo obrigatório na API.
- **Formulário:** Zod usado no `resolver` do `useForm`; mensagens em português.

### Padrões de mensagem
- Nome: `"Informe o nome"` / `"Nome completo *"` no label.
- Seleção (sede, cargo, etc.): `"Selecione uma sede"`, `"Selecione um cargo"`.
- Número mínimo: `"Salário deve ser maior ou igual a zero"`.
- Data: `"Data de nascimento inválida"` (refine com `!Number.isNaN(Date.parse(value))`).
- Eventos de calendário: `"Sede é obrigatória"`, `"Nome/Título é obrigatório"`, `"Data/hora de início é obrigatória"`, etc.

### Exemplo de schema de form (Zod)
```ts
const employeeFormSchema = z.object({
  fullName: z.string().min(1, "Informe o nome"),
  role: z.enum(roleOptions, { errorMap: () => ({ message: "Selecione um cargo" }) }),
  headquarterId: z.coerce.number().min(1, "Selecione uma sede"),
  salary: z.coerce.number().min(0, "Salário deve ser maior ou igual a zero"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  // ...
});
```

### Exibição de erro
- Usar sempre `<FormMessage />` dentro do `FormItem` correspondente ao campo para mostrar o erro do Zod.

### Testes E2E
- Os testes verificam mensagens de obrigatoriedade com: `page.locator('text=/obrigatório|required/i').first()`.

---

## 9. Resumo das máscaras

| Campo   | Máscara           | Armazenamento   | Arquivo        | Constante / Observação        |
|---------|-------------------|-----------------|----------------|-------------------------------|
| Telefone| (XX) XXXXX-XXXX   | Só dígitos, 11  | phoneMask.ts   | PHONE_MASK_MAX_LENGTH = 15    |
| CPF     | XXX.XXX.XXX-XX    | Só dígitos, 11  | cpfCepMask.ts  | -                             |
| CEP     | XXXXX-XXX         | Só dígitos, 8   | cpfCepMask.ts  | -                             |
| Email   | -                 | Texto livre     | -              | type="email", validar com .email() |
| Moeda   | R$ 1.234,56       | Integer centavos| currency.ts    | Exibir com formatCentsToBRL   |

---

## 10. Checklist para novo formulário

1. **Schema:** usar `insertXxxSchema` de `shared/schema` (ou de `shared/routes`) e estender com `.extend({ ... })` se precisar de validações ou campos adicionais (ex.: data como string, senha opcional na edição).
2. **Telefone:** importar `formatPhone`, `extractDigits`, `PHONE_MASK_MAX_LENGTH` de `@/lib/phoneMask`; valor formatado, onChange com dígitos, maxLength 15.
3. **CPF/CEP:** importar de `@/lib/cpfCepMask`; valor com `formatCPF`/`formatCEP`, onChange com `extractDigits`.
4. **Email:** `type="email"`; se opcional, `z.string().email("...").optional().or(z.literal(""))`.
5. **Nome:** label com * se obrigatório; schema com `.min(1, "mensagem")` quando obrigatório.
6. **Moeda:** decidir se o form guarda em reais (uso de `CurrencyInput` + conversão para centavos no submit) ou em centavos (Input com `formatCentsToBRL` + `parseCurrencyToNumber`); exibição em lista/detalhe sempre com `formatCentsToBRL`.
7. **Erros:** todo campo vinculado ao form deve ter `<FormMessage />`.
8. **Placeholders:** seguir exemplos existentes (ex.: "(00) 00000-0000", "000.000.000-00", "00000-000", "usuario@empresa.com").

---

*Documento gerado a partir da análise do repositório senior-care-v2-backoffice. Última revisão: fevereiro/2025.*
