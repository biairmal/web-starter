{{- define "web-starter.name" -}}
{{- .Chart.Name -}}
{{- end -}}

{{- define "web-starter.fullname" -}}
{{- .Release.Name -}}-{{- .Chart.Name -}}
{{- end -}}

{{- define "web-starter.labels" -}}
app.kubernetes.io/name: {{ include "web-starter.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Values.image.tag | default .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "web-starter.selectorLabels" -}}
app.kubernetes.io/name: {{ include "web-starter.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "web-starter.image" -}}
{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}
{{- end -}}
