# @summary Prometheus monitoring of Akamai access logs
#
class zulip_ops::prometheus::akamai {
  include zulip_ops::prometheus::base
  include zulip_ops::vector
  include zulip::supervisor

  $bin = $zulip_ops::vector::bin
  $conf = '/etc/vector.toml'
  $sqs_url = zulipsecret('secrets', 'akamai_sqs_url', '')

  file { $conf:
    ensure  => file,
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    content => template('zulip_ops/vector.toml.template.erb'),
  }
  file { "${zulip::common::supervisor_conf_dir}/prometheus_akamai_exporter.conf":
    ensure  => file,
    require => [
      User[zulip],
      Package[supervisor],
      File['/etc/vector.toml'],
      Zulip::External_Dep['vector'],
    ],
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    content => template('zulip_ops/supervisor/conf.d/prometheus_akamai_exporter.conf.template.erb'),
    notify  => Service[supervisor],
  }
}
