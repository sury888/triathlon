import { Helmet } from 'react-helmet-async'

export default function PageMeta({ title, description }) {
  const fullTitle = title ? `${title} | Fantasy Endurance` : 'Fantasy Endurance'
  const desc = description || 'Pick athletes, predict finishes, and compete in fantasy triathlon leagues.'

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
    </Helmet>
  )
}
