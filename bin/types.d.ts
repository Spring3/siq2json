export interface Entry {
  path: string
  props: {
    pathBuffer: Buffer
  }
  isUnicode: Boolean,
  pipe: (stream: any) => void
}

interface Author {
  author: string[]
}

interface Source {
  source: string[]
}

interface Info {
  authors: Author[]
  sources?: Source[]
}

interface GenericInfo {
  comments: string[]
}

interface QuestionParam {
  _: string
  $: {
    name: 'theme' | 'cost' | 'self' | 'knows'
  }
}

interface QuestionType {
  $: {
    name: 'auction' | 'bagcat' | 'sponsored'
  }
  param: QuestionParam[]
}

interface MediaScenario {
  _: string
  $: {
    type: 'image' | 'voice'
  }
}

interface Scenario {
  atom: (string | MediaScenario)[]
}

interface Answer {
  answer: string[]
}

interface QuestionData {
  $: {
    price: string
  },
  info?: GenericInfo[]
  type?: QuestionType[]
  scenario: Scenario[]
  right: Answer[]
}

interface QuestionEntry {
  question: QuestionData[]
}

interface ThemeData {
  $: {
    name: string
  },
  info?: GenericInfo[],
  questions: QuestionEntry[]
}

interface ThemeEntry {
  theme: ThemeData[]
}

interface RoundData {
  $: {
    name: string
  },
  themes: ThemeEntry[]
}

interface RoundEntry {
  round: RoundData[]
}


export interface Package {
  $: {
    name: string,
    version: string,
    id: string,
    date: string,
    difficulty?: string,
    restriction?: string,
    xmlns: string
  },
  info: Info[],
  rounds: RoundEntry[]
}
